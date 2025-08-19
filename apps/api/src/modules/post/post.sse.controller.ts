import { Controller, Sse, MessageEvent, Query, Req, Get } from '@nestjs/common';

import { Observable } from 'rxjs';
import { SseChannelService } from 'src/common/ssechannel/ssechannel.service';

@Controller('sse')
export class PostSSEController {
    constructor(private readonly sseChannel: SseChannelService) { }

    // SSE endpoint for clients to connect
    @Sse('stream')
    stream(
        @Req() req: any,
        @Query('channel') channel: string = 'default',
        @Query('userId') userId?: string,
        @Query('eventTypes') eventTypes?: string,
        @Query('lastEventId') lastEventId?: string,
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

    @Get('fire')
    fire(@Query('channel') channel: string) {
        let desiredChannel = this.sseChannel.broadcast({ channel, data: { event: 'Hello World' } });
        return desiredChannel
    }
}