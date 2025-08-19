import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PostResolver } from './post.resolver';
import { Post } from './entities/post.entity';

import { InngestModule } from '../../common/inngest/inngest.module';
import { AwsModule } from '../../common/aws/aws.module';
import { PostEventsService } from './events/post.event';
import { TenantContextService } from '../tenant/services/tenant-context.service';
import { TenantInterceptor } from '../tenant/intercepters/tenant.interceptor';
import { PostSSEController } from './post.sse.controller';
import { SseChannelService } from 'src/common/ssechannel/ssechannel.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    InngestModule,
    AwsModule,
  ],
  controllers: [PostController, PostSSEController],
  providers: [
    PostService,
    PostResolver,
    PostEventsService,
    TenantContextService,
    TenantInterceptor,
    SseChannelService
  ],
  exports: [PostService],
})
export class PostModule { }
