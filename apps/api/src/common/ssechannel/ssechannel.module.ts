import { Global, Module } from '@nestjs/common';
import { SseChannelService } from './ssechannel.service';


@Module({
    imports: [],
    controllers: [],
    providers: [SseChannelService],
    exports: [SseChannelService],
})
export class SSEChannelModule { }
