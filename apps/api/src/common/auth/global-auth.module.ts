import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { JwtAuthGuard } from './guards/jwt.guard';

/**
 * Example of how to set up global JWT authentication
 *
 * This configuration will:
 * 1. Apply JWT authentication to ALL routes by default
 * 2. Allow specific routes to be public using the @Public() decorator
 *
 * To use this, add it to your main AppModule imports
 */
@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class GlobalAuthModule {}

/**
 * Alternative: If you want to apply both JWT and Roles guards globally
 * (Use this if you want role-based protection on most routes)
 */
@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Uncomment the following if you want global role checking
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },
  ],
})
export class GlobalAuthWithRolesModule {}
