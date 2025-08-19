import { Controller, Sse, MessageEvent, Query, Req } from '@nestjs/common';

import { Observable } from 'rxjs';
import { SseChannelService } from 'src/common/ssechannel/ssechannel.service';

@Controller('sse')
export class SseController {
    constructor(private readonly sseChannel: SseChannelService) { }

    // SSE endpoint for clients to connect
    @Sse('stream')
    stream(
        @Query('channel') channel: string = 'default',
        @Query('userId') userId?: string,
        @Query('eventTypes') eventTypes?: string,
        @Query('lastEventId') lastEventId?: string,
        @Req() req: any
    ): Observable<MessageEvent> {
        // Parse eventTypes as array if provided
        const eventTypesArr = eventTypes ? eventTypes.split(',') : undefined;
        // Pass client metadata to service
        return this.sseChannel.connect(channel, {
            userId,
            ip: req.ip,
            eventTypes: eventTypesArr,
            lastEventId,
        });
    }
}