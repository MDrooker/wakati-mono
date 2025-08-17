import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantContextService {
  constructor(private configService: ConfigService) {}

  getDefaultTenanturn(): string | null {
    return this.configService.get<string>('DEFAULT_TENANT_URN', null);
  }

  resolveTenanturn(providedTenanturn?: string): string | null {
    return providedTenanturn || this.getDefaultTenanturn();
  }

  validateTenanturn(tenanturn: string): boolean {
    return tenanturn && tenanturn.startsWith('nesting:rockwell.tenant:');
  }

  extractTenantId(tenanturn: string): string | null {
    if (!this.validateTenanturn(tenanturn)) {
      return null;
    }
    return tenanturn.split(':')[2] || null;
  }
}
