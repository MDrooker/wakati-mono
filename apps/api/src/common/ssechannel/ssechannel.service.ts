import { Injectable, Inject, Optional } from '@nestjs/common';
import { Observable, Subject, interval, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
// OpenTelemetry imports (assume global tracer setup)
let tracer: any = null;
try {
    tracer = require('@opentelemetry/api').trace.getTracer('sse-channel');
} catch { }



export interface SseMessage {
    id?: string;
    event?: string;
    data: any;
}

export interface SseClientMeta {
    id: string;
    ip?: string;
    userId?: string;
    channel: string;
    eventTypes?: string[];
    lastEventId?: string;
    subject: Subject<SseMessage>;
    heartbeatSub?: Subscription;
    connectedAt: number;
}

@Injectable()
export class SseChannelService {
    // Channels: channelName -> { history, clients, historyLimit }
    private channels: Map<string, {
        history: SseMessage[];
        clients: Map<string, SseClientMeta>;
        historyLimit: number;
    }> = new Map();
    private defaultHistoryLimit = 100;
    private heartbeatIntervalMs = 15000;
    private rateLimitMs = 50;
    private lastBroadcast: Map<string, number> = new Map();
    private shuttingDown = false;

    constructor(@Optional() @Inject('SSE_HISTORY_LIMIT') historyLimit?: number) {
        if (historyLimit) this.defaultHistoryLimit = historyLimit;
    }

    // Connect a new client to a channel
    connect(channel = 'default', meta: Partial<SseClientMeta> = {}): Observable<SseMessage> {
        if (!this.channels.has(channel)) {
            this.channels.set(channel, {
                history: [],
                clients: new Map(),
                historyLimit: this.defaultHistoryLimit,
            });
        }
        const ch = this.channels.get(channel)!;
        const clientId = meta.id || Math.random().toString(36).slice(2);
        const subject = new Subject<SseMessage>();
        const client: SseClientMeta = {
            ...meta,
            id: clientId,
            channel,
            subject,
            connectedAt: Date.now(),
        };
        ch.clients.set(clientId, client);

        // Send history (optionally from lastEventId)
        let historyToSend = ch.history;
        if (meta.lastEventId) {
            const idx = ch.history.findIndex(m => m.id === meta.lastEventId);
            if (idx >= 0) historyToSend = ch.history.slice(idx + 1);
        }
        historyToSend.forEach(msg => subject.next(msg));

        // Heartbeat
        client.heartbeatSub = interval(this.heartbeatIntervalMs).subscribe(() => {
            subject.next({ event: 'ping', data: 'heartbeat' });
        });

        // Remove client on unsubscribe
        subject.subscribe({
            complete: () => this.removeClient(channel, clientId),
            error: () => this.removeClient(channel, clientId),
        });

        // Logging
        if (tracer) tracer.startSpan('sse.connect').end();

        // Graceful shutdown
        if (this.shuttingDown) {
            subject.next({ event: 'server-shutdown', data: 'Server is shutting down' });
            subject.complete();
        }

        // Event filtering
        if (client.eventTypes && client.eventTypes.length) {
            return subject.asObservable().pipe(
                filter(msg => !msg.event || client.eventTypes!.includes(msg.event))
            );
        }
        return subject.asObservable();
    }

    // Remove client
    private removeClient(channel: string, clientId: string) {
        const ch = this.channels.get(channel);
        if (!ch) return;
        const client = ch.clients.get(clientId);
        if (client?.heartbeatSub) client.heartbeatSub.unsubscribe();
        ch.clients.delete(clientId);
        if (tracer) tracer.startSpan('sse.disconnect').end();
    }

    // Broadcast a message to all clients in a channel
    broadcast({ data, event, id, channel = 'default' }: { data: any, event?: string, id?: string, channel?: string }) {
        const now = Date.now();
        // if (this.lastBroadcast.has(channel) && now - this.lastBroadcast.get(channel)! < this.rateLimitMs) {
        //     // Rate limit
        //     if (tracer) tracer.startSpan('sse.rate-limit').end();
        //     return;
        // }
        this.lastBroadcast.set(channel, now);
        if (!this.channels.has(channel)) {
            this.channels.set(channel, {
                history: [],
                clients: new Map(),
                historyLimit: this.defaultHistoryLimit,
            });
        }
        const ch = this.channels.get(channel)!;
        const message: SseMessage = { data, event, id };
        ch.history.push(message);
        if (ch.history.length > ch.historyLimit) {
            ch.history.shift();
        }
        ch.clients.forEach(client => {
            // Event filtering per client
            if (!client.eventTypes || !event || client.eventTypes.includes(event)) {
                client.subject.next(message);
            }
        });
        if (tracer) tracer.startSpan('sse.broadcast').end();
    }

    // Get current user count (optionally per channel)
    getUserCount(channel?: string): number {
        if (channel) {
            return this.channels.get(channel)?.clients.size || 0;
        }
        let total = 0;
        this.channels.forEach(ch => total += ch.clients.size);
        return total;
    }

    // Get message history (optionally per channel)
    getHistory(channel = 'default'): SseMessage[] {
        return [...(this.channels.get(channel)?.history || [])];
    }

    // Set history limit per channel
    setHistoryLimit(limit: number, channel = 'default') {
        if (!this.channels.has(channel)) return;
        this.channels.get(channel)!.historyLimit = limit;
    }

    // Graceful shutdown
    shutdown() {
        this.shuttingDown = true;
        this.channels.forEach(ch => {
            ch.clients.forEach(client => {
                client.subject.next({ event: 'server-shutdown', data: 'Server is shutting down' });
                client.subject.complete();
            });
        });
        if (tracer) tracer.startSpan('sse.shutdown').end();
    }

    // Error handling: broadcast error event
    broadcastError(error: any, channel = 'default') {
        this.broadcast({ error: error?.message || error }, 'error', undefined, channel);
        if (tracer) tracer.startSpan('sse.error').end();
    }

    // Logging & metrics: expose stats
    getStats() {
        const stats: Record<string, any> = {};
        this.channels.forEach((ch, name) => {
            stats[name] = {
                userCount: ch.clients.size,
                historyLength: ch.history.length,
                historyLimit: ch.historyLimit,
            };
        });
        return stats;
    }
}
