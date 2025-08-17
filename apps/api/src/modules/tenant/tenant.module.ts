import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantResolver } from './tenant.resolver';
import { TenantContextService } from './services/tenant-context.service';
import { TenantInterceptor } from './intercepters/tenant.interceptor';
import { TenantHeaderInterceptor } from './intercepters/tenant-header.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantResolver,
    TenantContextService,
    TenantInterceptor,
    TenantHeaderInterceptor,
  ],
  exports: [
    TenantService,
    TenantContextService,
    TenantInterceptor,
    TenantHeaderInterceptor,
  ],
})
export class TenantModule {}
