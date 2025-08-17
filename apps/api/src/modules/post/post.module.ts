import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PostResolver } from './post.resolver';
import { Post } from './entities/post.entity';
import { Asset } from '../asset/entities/asset.entity';
import { Tag } from '../asset/entities/tag.entity';
import { InngestModule } from '../../common/inngest/inngest.module';
import { AwsModule } from '../../common/aws/aws.module';
import { PostEventsService } from './events/post.event';
import { TenantContextService } from '../tenant/services/tenant-context.service';
import { TenantInterceptor } from '../tenant/intercepters/tenant.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Asset, Tag]),
    InngestModule,
    AwsModule,
  ],
  controllers: [PostController],
  providers: [
    PostService,
    PostResolver,
    PostEventsService,
    TenantContextService,
    TenantInterceptor,
  ],
  exports: [PostService],
})
export class PostModule {}
