/**
 * TenantHeaderInterceptor Usage Guide
 *
 * This file demonstrates how to use the TenantHeaderInterceptor to automatically
 * inject tenant URN values into request headers when not provided.
 */

// ================================
// 1. Basic Usage - Single Interceptor
// ================================

/*
// Replace the existing TenantInterceptor with TenantHeaderInterceptor
import { TenantHeaderInterceptor } from 'src/modules/tenant/intercepters/tenant-header.interceptor';

@ApiTags('Posts')
@UseInterceptors(TenantHeaderInterceptor) // Use header-based interceptor
@Controller('posts')
export class PostController {
  
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'tenanturn', required: false, description: 'Tenant URN for multi-tenancy' })
  async create(
    @Body() createPostDto: CreatePostDto,
    @Headers('tenanturn') tenanturn?: string, // Access from headers
  ) {
    // tenanturn will be either the provided header value or the default
    const post = await this.postService.create({
      input: createPostDto,
      tenanturn: tenanturn,
    });
    
    return { success: true, data: post };
  }
}
*/

// ================================
// 2. Dual Support - Both Query and Header
// ================================

/*
// Support both query parameters and headers for maximum compatibility
import { TenantInterceptor } from 'src/modules/tenant/intercepters/tenant.interceptor';
import { TenantHeaderInterceptor } from 'src/modules/tenant/intercepters/tenant-header.interceptor';

@ApiTags('Posts')
@UseInterceptors(TenantInterceptor, TenantHeaderInterceptor) // Both interceptors
@Controller('posts')
export class PostController {
  
  @Get()
  @ApiQuery({ name: 'tenanturn', required: false, description: 'Tenant URN (query param)' })
  @ApiHeader({ name: 'tenanturn', required: false, description: 'Tenant URN (header)' })
  async findAll(
    @Query('tenanturn') tenanturnFromQuery?: string,
    @Headers('tenanturn') tenanturnFromHeader?: string,
  ) {
    // Prefer header over query param, but support both
    const tenanturn = tenanturnFromHeader || tenanturnFromQuery;
    
    const posts = await this.postService.findAll(tenanturn);
    
    return {
      success: true,
      data: posts,
      metadata: {
        tenantSource: tenanturnFromHeader ? 'header' : 'query',
        tenantUrn: tenanturn,
      },
    };
  }
}
*/

// ================================
// 3. Global Application
// ================================

/*
// Apply interceptor globally in app.module.ts:

import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantHeaderInterceptor } from './modules/tenant/intercepters/tenant-header.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantHeaderInterceptor,
    },
    // ... other providers
  ],
})
export class AppModule {}
*/

// ================================
// 4. Accessing Injected Headers
// ================================

/*
// Method 1: Using @Headers decorator
async someMethod(@Headers('tenanturn') tenanturn: string) {
  // tenanturn will always have a value due to the interceptor
}

// Method 2: Using Request object
async someMethod(@Request() req: any) {
  const tenanturn = req.headers.tenanturn;
  // Process with tenant context
}

// Method 3: Custom header extraction utility
private getTenantUrn(req: any): string {
  return req.headers.tenanturn || 'default';
}
*/

// ================================
// 5. Environment Configuration
// ================================

/*
// Set the default tenant URN in your environment file:
// .env
DEFAULT_TENANT_URN=nesting:rockwell.tenant:default

// The interceptor will use this value when no header is provided
*/

/**
 * Key Benefits:
 *
 * 1. Clean API Design - Headers are more appropriate for cross-cutting concerns
 * 2. Automatic Defaults - No need to manually check for tenant context
 * 3. Backward Compatibility - Can work alongside existing query-based interceptor
 * 4. Consistent Tenant Context - All requests will have tenant information
 * 5. Reduced Boilerplate - Less manual tenant URN handling in controllers
 */

export {}; // Make this a module
