import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { BasicStrategy } from './strategy/basic.auth.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';
import { BasicAuthGuard } from './guards/basic.guard';
import { BearerTokenGuard } from './guards/bearer.guard';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtService } from './service/jwt.service';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    BasicStrategy,
    JwtStrategy,
    BasicAuthGuard,
    BearerTokenGuard,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
  ],
  exports: [JwtAuthGuard, RolesGuard, JwtService, PassportModule],
})
export class AuthModule {}
