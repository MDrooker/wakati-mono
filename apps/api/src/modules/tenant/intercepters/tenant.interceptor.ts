import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from '../services/tenant-context.service';

/**
 * TenantInterceptor automatically injects a default tenant URN when not provided.
 *
 * This interceptor:
 * 1. Checks if 'tenanturn' query parameter is present in the request
 * 2. If not present, retrieves the default tenant URN from configuration (DEFAULT_TENANT_URN env var)
 * 3. Injects the default tenant URN into the request query parameters
 *
 * This ensures all endpoints have a tenant context without requiring
 * manual parameter passing for every request.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Check if tenanturn is already provided in query parameters
    if (!request.query?.tenanturn) {
      // Get the default tenant URN from configuration
      const defaultTenanturn = this.tenantContextService.getDefaultTenanturn();

      // Inject default tenant URN if available
      if (defaultTenanturn) {
        // Initialize query object if it doesn't exist
        if (!request.query) {
          request.query = {};
        }

        request.query.tenanturn = defaultTenanturn;

        this.logger.debug(
          `Injected default tenant URN: ${defaultTenanturn} for ${request.method} ${request.url}`,
        );
      } else {
        this.logger.warn(
          'No default tenant URN configured. Set DEFAULT_TENANT_URN environment variable.',
        );
      }
    }

    return next.handle();
  }
}
