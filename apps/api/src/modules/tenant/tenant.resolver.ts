import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { TenantService } from './tenant.service';
import { CreateTenantInput } from './dto/create-tenant.input';
import { UpdateTenantInput } from './dto/update-tenant.input';
import { trace } from '@opentelemetry/api';
import { Span } from 'nestjs-otel';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/auth/guards/jwt.guard';

@Resolver('Tenant')
export class TenantResolver {
  constructor(private readonly tenantService: TenantService) {}

  @Mutation('createTenant')
  @UseGuards(JwtAuthGuard)
  createTenant(
    @Args('createTenantInput') createTenantInput: CreateTenantInput,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.tenantService.create(createTenantInput);
  }

  @Span('tenants.findAll')
  @Query('tenants')
  @UseGuards(JwtAuthGuard)
  findAll(@Args('tenanturn') tenanturn?: string) {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttribute('resolver.name', 'tenant');
      currentSpan.setAttribute('resolver.type', 'Query');
    }
    return this.tenantService.findAll();
  }

  @Query('tenant')
  @UseGuards(JwtAuthGuard)
  findOne(@Args('id') id: string, @Args('tenanturn') tenanturn?: string) {
    return this.tenantService.findOne(id);
  }

  @Query('tenantByTenanturn')
  findByTenanturn(@Args('tenanturn') tenanturn: string) {
    return this.tenantService.findByTenanturn(tenanturn);
  }

  @Query('tenantByDomain')
  findByDomain(@Args('domain') domain: string) {
    return this.tenantService.findByDomain(domain);
  }

  @Mutation('updateTenant')
  @UseGuards(JwtAuthGuard)
  update(
    @Args('updateTenantInput') updateTenantInput: UpdateTenantInput,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.tenantService.update(updateTenantInput.id, updateTenantInput);
  }

  @Mutation('removeTenant')
  @UseGuards(JwtAuthGuard)
  remove(@Args('id') id: string, @Args('tenanturn') tenanturn?: string) {
    return this.tenantService.remove(id);
  }
}
