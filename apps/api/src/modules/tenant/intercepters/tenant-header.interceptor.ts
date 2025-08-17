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
 * TenantHeaderInterceptor automatically injects a default tenant URN header when not provided.
 *
 * This interceptor:
 * 1. Checks if 'tenanturn' header is present in the request
 * 2. If not present, retrieves the default tenant URN from configuration (DEFAULT_TENANT_URN env var)
 * 3. Injects the default tenant URN into the request headers
 *
 * This ensures all endpoints have a tenant context available in headers without requiring
 * manual header setting for every request.
 */
@Injectable()
export class TenantHeaderInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantHeaderInterceptor.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Check if tenanturn is already provided in headers
    if (!request.headers?.tenanturn) {
      // Get the default tenant URN from configuration
      const defaultTenanturn = this.tenantContextService.getDefaultTenanturn();

      // Inject default tenant URN if available
      if (defaultTenanturn) {
        // Initialize headers object if it doesn't exist
        if (!request.headers) {
          request.headers = {};
        }

        request.headers.tenanturn = defaultTenanturn;

        this.logger.debug(
          `Injected default tenant URN header: ${defaultTenanturn} for ${request.method} ${request.url}`,
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
