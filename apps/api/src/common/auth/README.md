# JWT Authentication for NestJS API

This authentication system provides JWT (JSON Web Token) based authentication for your NestJS application. It includes guards, strategies, decorators, and services to handle secure authentication and authorization.

## Features

- 🔐 JWT token generation and validation
- 🛡️ JWT Authentication Guard
- 👥 Role-based access control (RBAC)
- 🔓 Public route decorator
- 📝 Current user decorator for easy access to authenticated user data
- ⚙️ Configurable through environment variables

## Environment Variables

Add these environment variables to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=1h  # Can be: 30s, 5m, 1h, 1d, etc.
```

## Quick Start

### 1. Import the AuthModule

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './common/auth/auth.module';

@Module({
  imports: [AuthModule],
  // ... other imports
})
export class AppModule {}
```

### 2. Basic Usage in Controllers

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Public, JwtPayload } from './common/auth';

@Controller('users')
@UseGuards(JwtAuthGuard) // Apply JWT protection to all routes in this controller
export class UsersController {
  
  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Your profile data',
      user
    };
  }

  @Public() // This route is accessible without authentication
  @Get('public-info')
  getPublicInfo() {
    return { message: 'This is public information' };
  }
}
```

### 3. Role-Based Access Control

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, JwtPayload } from './common/auth';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  
  @Roles('admin') // Only users with 'admin' role can access
  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return { message: 'Admin dashboard data' };
  }

  @Roles('admin', 'moderator') // Users with either 'admin' or 'moderator' role
  @Get('moderation')
  getModerationTools(@CurrentUser() user: JwtPayload) {
    return { message: 'Moderation tools' };
  }
}
```

### 4. Generate JWT Tokens

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService, UserTokenData } from './common/auth';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(username: string, password: string) {
    // Validate user credentials (check database, etc.)
    const user = await this.validateUser(username, password);
    
    if (user) {
      const tokenData: UserTokenData = {
        sub: user.id,
        userurn: user.userurn,
        roles: user.roles || []
      };

      return await this.jwtService.generateToken(tokenData);
    }
    
    throw new UnauthorizedException('Invalid credentials');
  }
}
```

## Available Guards

### JwtAuthGuard
Validates JWT tokens and extracts user information.

```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
protectedRoute(@CurrentUser() user: JwtPayload) {
  return { user };
}
```

### RolesGuard
Checks if the authenticated user has required roles.

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
@Get('admin-area')
adminOnlyRoute() {
  return { message: 'Admin content' };
}
```

## Available Decorators

### @Public()
Marks a route as public (no authentication required).

```typescript
@Public()
@Get('public-route')
publicRoute() {
  return { message: 'No auth needed' };
}
```

### @CurrentUser()
Extracts the current authenticated user from the request.

```typescript
@Get('me')
getCurrentUser(@CurrentUser() user: JwtPayload) {
  return user;
}

// Extract specific user property
@Get('userurn')
getUserurn(@CurrentUser('username') userurn: string) {
  return { userurn };
}
```

### @Roles()
Specifies required roles for route access.

```typescript
@Roles('admin')
@Get('admin-only')
adminRoute() {
  return { message: 'Admin only' };
}
```

## JWT Token Structure

The JWT payload contains:

```typescript
interface JwtPayload {
  sub: string;        // User ID
  username: string;   // Username (maps to userurn from UserTokenData)
  roles?: string[];   // User roles array (optional)
  iat?: number;       // Issued at timestamp
  exp?: number;       // Expiration timestamp
}
```

## Token Response Format

When generating tokens, the service returns:

```typescript
interface TokenResponse {
  access_token: string;   // The JWT token
  token_type: string;     // Always "Bearer"
  expires_in: number;     // Expiration time in seconds
}
```

## Using JWT Tokens

### In HTTP Headers
```
Authorization: Bearer <your-jwt-token-here>
```

### Example Login Flow

1. **Login Request:**
```javascript
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

2. **Login Response:**
```javascript
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

3. **Authenticated Request:**
```javascript
GET /users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Global JWT Protection

To protect all routes by default (except those marked with `@Public()`):

```typescript
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/auth';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

## Error Handling

The JWT system throws the following exceptions:

- `UnauthorizedException`: Invalid or missing JWT token
- `UnauthorizedException`: Invalid token payload
- `ForbiddenException`: User doesn't have required roles (when using RolesGuard)

## Security Best Practices

1. **Use a strong JWT secret** (at least 32 characters)
2. **Set appropriate token expiration times** (1-24 hours for access tokens)
3. **Store JWT secrets in environment variables**, never in code
4. **Use HTTPS** in production to protect tokens in transit
5. **Implement token refresh** for better user experience
6. **Consider token blacklisting** for logout functionality

## Testing

Example test for protected endpoints:

```typescript
describe('Protected Endpoints', () => {
  it('should access protected route with valid token', async () => {
    const token = await jwtService.generateToken({
      sub: '1',
      userurn: 'testuser',
      roles: ['user']
    });

    return request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${token.access_token}`)
      .expect(200);
  });

  it('should reject request without token', async () => {
    return request(app.getHttpServer())
      .get('/protected')
      .expect(401);
  });
});
```

## File Structure

```
src/common/auth/
├── auth.module.ts                 # Main auth module
├── index.ts                      # Barrel exports
├── decorators/
│   ├── current-user.decorator.ts # @CurrentUser() decorator
│   └── roles.decorator.ts        # @Roles() decorator
├── guards/
│   ├── jwt.guard.ts             # JWT authentication guard
│   ├── roles.guard.ts           # Role-based authorization guard
│   ├── basic.guard.ts           # Basic auth guard (existing)
│   └── bearer.guard.ts          # Bearer token guard (existing)
├── service/
│   └── jwt.service.ts           # JWT token operations
├── strategy/
│   ├── jwt.strategy.ts          # Passport JWT strategy
│   └── basic.auth.strategy.ts   # Basic auth strategy (existing)
└── examples/
    └── auth-example.controller.ts # Usage examples
```
