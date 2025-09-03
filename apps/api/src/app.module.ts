import { join } from 'path';
import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommonModule } from './common/common.module';

import { GraphQLModule } from '@nestjs/graphql';

import { YogaDriver, YogaDriverConfig } from '@graphql-yoga/nestjs';

import {
  constraintDirective,
  constraintDirectiveTypeDefs,
} from 'graphql-constraint-directive';

import { ServeStaticModule } from '@nestjs/serve-static';
import { Cache } from './common/cache/cache/cache.module';
import { DateTypeDefinition } from 'graphql-scalars';
import { TypeORMDatabaseModule } from './common/database/database.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './common/auth/auth.module';
import { UtilitiesModule } from './common/utilities/utilities.module';
import { OpenTelemetryModule } from 'nestjs-otel';
import { DevtoolsModule } from '@nestjs/devtools-integration';


import { UserModule } from './modules/user/user.module';
import { DiscoveryModule } from '@nestjs/core';
import { InngestModule } from './common/inngest/inngest.module';
import { PostModule } from './modules/post/post.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { SSEChannelModule } from './common/ssechannel/ssechannel.module';

const logger = new Logger('ApplicationModule');

const OpenTelemetryModuleConfig = OpenTelemetryModule.forRootAsync({
  useFactory: (configService: ConfigService) => {
    logger.log('🔭 Configuring OpenTelemetry...');
    return {
      metrics: {
        hostMetrics: true, // Includes Host Metrics
        apiMetrics: {
          enable: true, // Includes api metrics
          defaultAttributes: {
            // You can set default labels for api metrics
            custom: 'label',
          },
          ignoreRoutes: ['/favicon.ico'], // You can ignore specific routes (See https://docs.nestjs.com/middleware#excluding-routes for options)
          ignoreUndefinedRoutes: false, //Records metrics for all URLs, even undefined ones
          prefix: 'my_prefix', // Add a custom prefix to all API metrics
        },
      },
    };
  },
});

@Module({
  imports: [
    // OpenTelemetryModuleConfig,

    // DevtoolsModule.register({
    //   http: process.env.NODE_ENV !== 'production'
    // }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    InngestModule.forRoot({
      apiKey: process.env.INNGEST_API_KEY,
      eventKey: process.env.INNGEST_EVENT_KEY,
      signingKey: process.env.INNGEST_SIGNING_KEY,
      isDev:
        process.env.INNGEST_DEVMODE === 'true' ||
        process.env.NODE_ENV === 'development',
      logger: {
        info: (message: string, extra?: any) => {
          const logger = new Logger('Inngest');
          logger.log(`${message} ${extra ? ' ' + JSON.stringify(extra) : ''}`);
        },
        warn: (message: string, extra?: any) => {
          const logger = new Logger('Inngest');
          logger.warn(`${message} ${extra ? ' ' + JSON.stringify(extra) : ''}`);
        },
        error: (message: string, extra?: any) => {
          const logger = new Logger('Inngest');
          logger.error(
            `${message} ${extra ? ' ' + JSON.stringify(extra) : ''}`,
          );
        },
        debug: (message: string, extra?: any) => {
          const logger = new Logger('Inngest');
          logger.debug(
            `${message} ${extra ? ' ' + JSON.stringify(extra) : ''}`,
          );
        },
      },
    }),
    TypeORMDatabaseModule,
    DiscoveryModule,
    Cache,
    // SupabaseModule,
    // AuthModule,
    // SSEChannelModule,
   
    // ServeStaticModule.forRoot({
    //   rootPath: join(__dirname, '..', 'client'),
    //   renderPath: '/client',
    // }),
    // CommonModule,
    // UtilitiesModule,
    UserModule,
    // TenantModule,
    PostModule,
  ],
  controllers: [],
  exports: [],
  providers: [],
})
export class ApplicationModule implements OnModuleInit {
  onModuleInit() {
    // Check for critical environment variables
    const criticalEnvVars = ['DATABASE_URL', 'PORT', 'SYSTEM', 'PRODUCT'];
    criticalEnvVars.forEach((envVar) => {
      if (!process.env[envVar]) {
        logger.warn(`⚠️  Environment variable ${envVar} is not set`);
      } else {
        logger.log(`✅ Environment variable ${envVar} is configured`);
      }
    });
  }
}
