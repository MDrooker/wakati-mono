import { Global, Module } from '@nestjs/common';

import { SupabaseService } from './supabase.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth/supabase.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [SupabaseService, AuthGuard],
  exports: [AuthGuard, SupabaseService],
})
export class SupabaseModule {}
