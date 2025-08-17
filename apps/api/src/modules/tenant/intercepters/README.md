# Tenant Interceptors

## Overview

This directory contains NestJS interceptors for handling tenant context in multi-tenant applications:

- **`TenantInterceptor`**: Automatically injects default tenant URN into query parameters
- **`TenantHeaderInterceptor`**: Automatically injects default tenant URN into request headers

Both interceptors ensure all API endpoints have proper tenant context without requiring manual parameter/header passing for every request.

## TenantInterceptor (Query Parameter Based)

The `TenantInterceptor` examines incoming HTTP requests for the presence of a `tenanturn` query parameter and injects a default value when not provided.

### How It Works

1. **Request Inspection**: The interceptor examines incoming HTTP requests for the presence of a `tenanturn` query parameter
2. **Default Injection**: If no `tenanturn` is found, it retrieves the default tenant URN from the configuration service
3. **Parameter Injection**: The default tenant URN is automatically injected into the request's query parameters
4. **Request Continuation**: The request proceeds normally with the tenant context now available

## TenantHeaderInterceptor (Header Based)

The `TenantHeaderInterceptor` examines incoming HTTP requests for the presence of a `tenanturn` header and injects a default value when not provided.

### How It Works

1. **Header Inspection**: The interceptor examines incoming HTTP requests for the presence of a `tenanturn` header
2. **Default Injection**: If no `tenanturn` header is found, it retrieves the default tenant URN from the configuration service
3. **Header Injection**: The default tenant URN is automatically injected into the request headers
4. **Request Continuation**: The request proceeds normally with the tenant context now available

## Configuration

The interceptor relies on the `DEFAULT_TENANT_URN` environment variable for the default tenant URN value. Set this in your environment configuration:

```bash
DEFAULT_TENANT_URN=nesting:rockwell.tenant:default
```

## Usage

### Controller-Level Application

Apply interceptors to an entire controller:

```typescript
import { UseInterceptors, Controller } from '@nestjs/common';
import { TenantInterceptor } from './tenant.interceptor';
import { TenantHeaderInterceptor } from './tenant-header.interceptor';

// Using query parameter interceptor
@UseInterceptors(TenantInterceptor)
@Controller('posts')
export class PostController {
  // All methods will have tenant context injected via query parameters
}

// Using header interceptor
@UseInterceptors(TenantHeaderInterceptor)
@Controller('users')
export class UserController {
  // All methods will have tenant context injected via headers
}

// Using both interceptors together
@UseInterceptors(TenantInterceptor, TenantHeaderInterceptor)
@Controller('assets')
export class AssetController {
  // All methods will have tenant context injected via both query params and headers
}
```

### Method-Level Application

Apply interceptors to specific methods:

```typescript
@Get()
@UseInterceptors(TenantHeaderInterceptor)
async findAll(@Headers('tenanturn') tenanturn: string) {
  // Only this method will have tenant context injected via headers
}
```

### Global Application

Apply interceptors globally in `app.module.ts`:

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantInterceptor } from './modules/tenant/intercepters/tenant.interceptor';
import { TenantHeaderInterceptor } from './modules/tenant/intercepters/tenant-header.interceptor';

@Module({
  providers: [
    // Query parameter based globally
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    // Header based globally
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantHeaderInterceptor,
    },
    // ... other providers
  ],
})
export class AppModule {}
```

## Module Setup

Ensure the interceptors and their dependencies are properly provided in your module:

```typescript
import { Module } from '@nestjs/common';
import { TenantInterceptor } from './intercepters/tenant.interceptor';
import { TenantHeaderInterceptor } from './intercepters/tenant-header.interceptor';
import { TenantContextService } from './services/tenant-context.service';

@Module({
  providers: [
    TenantContextService,
    TenantInterceptor,
    TenantHeaderInterceptor,
    // ... other providers
  ],
  exports: [
    TenantContextService,
    TenantInterceptor,
    TenantHeaderInterceptor,
  ],
  // ... other module configuration
})
export class TenantModule {}
```

## Accessing Tenant Context

### From Query Parameters (TenantInterceptor)

```typescript
@Get()
async findAll(@Query('tenanturn') tenanturn: string) {
  // tenanturn will either be the provided query param or the default
  return this.service.findAll(tenanturn);
}
```

### From Headers (TenantHeaderInterceptor)

```typescript
@Get()
async findAll(@Headers('tenanturn') tenanturn: string) {
  // tenanturn will either be the provided header value or the default
  return this.service.findAll(tenanturn);
}
```

### From Request Object

```typescript
@Get()
async findAll(@Request() req) {
  const tenanturnFromQuery = req.query.tenanturn;
  const tenanturnFromHeader = req.headers.tenanturn;
  return this.service.findAll(tenanturnFromQuery || tenanturnFromHeader);
}
```

## Example Scenarios

### TenantInterceptor (Query Parameters)

#### Scenario 1: Request with Tenant URN
```
GET /posts?tenanturn=nesting:rockwell.tenant:custom
```
**Result**: No modification - request proceeds with the provided tenant URN.

#### Scenario 2: Request without Tenant URN
```
GET /posts
```
**Result**: Interceptor injects default tenant URN:
```
GET /posts?tenanturn=nesting:rockwell.tenant:default
```

### TenantHeaderInterceptor (Headers)

#### Scenario 1: Request with Tenant URN Header
```
GET /posts
Headers: tenanturn: nesting:rockwell.tenant:custom
```
**Result**: No modification - request proceeds with the provided tenant URN header.

#### Scenario 2: Request without Tenant URN Header
```
GET /posts
```
**Result**: Interceptor injects default tenant URN header:
```
GET /posts
Headers: tenanturn: nesting:rockwell.tenant:default
```

### Common Scenario: No Default Configured
```
GET /posts
```
**Result**: Warning logged, request proceeds without tenant URN injection.

## Benefits

- **Simplified API Usage**: Frontend applications don't need to manually include tenant URNs in every request
- **Multi-tenant Support**: Ensures proper tenant isolation by default
- **Flexible Configuration**: Can be applied at different levels (global, controller, method)
- **Multiple Transport Options**: Support for both query parameters and headers
- **Backward Compatibility**: Existing requests with explicit tenant URNs continue to work unchanged
- **Development Convenience**: Reduces boilerplate code in development and testing
- **Clean API Design**: Headers are more appropriate for cross-cutting concerns like tenancy

## Dependencies

- `TenantContextService`: Provides access to tenant configuration and default values
- `ConfigService`: Used by TenantContextService to read environment variables

## Logging

Both interceptors provide debug and warning logs:
- **Debug**: When a default tenant URN is successfully injected
- **Warning**: When no default tenant URN is configured

Enable debug logging in your NestJS configuration to see injection events during development.

## Choosing Between Interceptors

### Use TenantInterceptor (Query Parameters) when:
- Working with existing APIs that expect query parameters
- Building public APIs where tenant context should be visible in URLs
- Debugging scenarios where you want to see tenant context in request logs

### Use TenantHeaderInterceptor (Headers) when:
- Building clean RESTful APIs where tenant context is a cross-cutting concern
- Working with frontend applications that can easily set headers
- Implementing multi-tenant SaaS applications where tenant context should be transparent
- Following HTTP best practices for metadata transmission
