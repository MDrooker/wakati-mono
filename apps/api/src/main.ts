import 'reflect-metadata';
import { NestFactory, PartialGraphHost, Reflector } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { ConfigService } from '@nestjs/config';
import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerCustomOptions,
} from '@nestjs/swagger';
import otelSDK from './tracing';
import multipart from '@fastify/multipart';
import { writeFileSync } from 'fs';

import { Logger, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ServiceLocator } from './common/service-locator/service-locator';
import inngestFastify, { fastifyPlugin, serve } from 'inngest/fastify';
import { InngestService } from './common/inngest/inngest.service';
import { GlobalInngestFunctionsRegistry } from './common/inngest/inngest.functions.registry';
import { ClusterModule } from './common/cluster/cluster.module';

const API_DEFAULT_PREFIX = '/api/v1/';
const logger = new Logger('Bootstrap');

// Global error handlers for unhandled exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error.message);
  logger.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Sets up Swagger documentation for the API
 * @param app - The NestJS application instance
 * @param system - The system name (e.g., 'wakati')
 * @param product - The product name (e.g., 'api')
 */
function setupSwaggerDocumentation(
  app: NestFastifyApplication,
  system: string,
  product: string,
): void {
  logger.log('📚 Setting up Swagger documentation...');
  const docBuilderConfig = new DocumentBuilder()
    .setTitle(`${product} API for ${system}`)
    .setDescription(`Comprehensive API for ${product} - Content Management & Asset Platform`)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Users', 'User management and authentication')
    .addTag('Posts', 'Content creation and rich text management')

    .build();
  const options: SwaggerCustomOptions = {
    ui: true, // Swagger UI is disabled
    raw: ['json'], // JSON API definition is still accessible (YAML is disabled)
    swaggerOptions: {
      docExpansion: 'none', // Collapse all sections by default
      defaultExpandedDepth: 0, // Prevents automatic expansion of tags or endpoints.
      // defaultModelsExpandDepth: -1, // Hides models by default.
    }
  };
  const document = SwaggerModule.createDocument(app, docBuilderConfig);
  SwaggerModule.setup('api', app, document, options);
  logger.log('✅ Swagger documentation configured at /api');
}

async function bootstrap() {

  try {
    logger.log(`🚀 Starting ${process.env.SYSTEM} API server...`);
    logger.log('Environment variables check:');
    logger.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
    logger.log(`- PORT: ${process.env.PORT || 'not set'}`);
    logger.log(
      `- DATABASE_URL: ${process.env.DATABASE_URL ? '✅ set' : '❌ not set'}`,
    );
    logger.log(
      `- INNGEST_API_KEY: ${process.env.INNGEST_API_KEY ? '✅ set' : '❌ not set'}`,
    );
    logger.log(
      `- SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ set' : '❌ not set'}`,
    );

    // await otelSDK.start();
    logger.log('✅ OTEL SDK initialization skipped (commented out)');

    // initializeTransactionalContext();
    logger.log('✅ Transactional context initialization skipped (commented out)');

    logger.log('📦 Creating NestJS application with Fastify adapter...');
    const app = await NestFactory.create<NestFastifyApplication>(
      ApplicationModule,
      new FastifyAdapter({
        bodyLimit: 104857600,
        logger:
          process.env.NODE_ENV === 'development'
            ? {
              level: 'debug',
            }
            : false,
      }),
      {
        logger:
          process.env.NODE_ENV === 'development'
            ? ['error', 'warn', 'log', 'debug', 'verbose']
            : ['error', 'warn', 'log'],
      },
    );

    const config = app.get(ConfigService);
    const port = config.get<string>('PORT') || '8080';
    const system = config.get<string>('SYSTEM') || 'wakati';
    const product = config.get<string>('PRODUCT') || 'api';
    logger.log('✅ NestJS application created successfully');

    const fastifyInstance = app.getHttpAdapter().getInstance();


    logger.log('🌐 Configuring CORS...');
    app.enableCors({
      origin: '*',
      credentials: true,
      // all headers that client are allowed to use
      allowedHeaders: [
        'Accept',
        'Authorization',
        'Content-Type',
        'X-Requested-With',
        'apollo-require-preflight',
      ],
      methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    });
    logger.log('✅ CORS configured');

    logger.log('📤 Registering multipart support...');
    await fastifyInstance.register(multipart as any);
    logger.log('✅ Multipart support registered');
    app.enableShutdownHooks();
    // Enable class-transformer based serialization for @Expose() getters
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    // app.useGlobalInterceptors(new NewrelicInterceptor());

    // Initialize ServiceLocator with the app context for Inngest functions
    logger.log('🔧 Initializing ServiceLocator...');
    ServiceLocator.setAppContext(app);
    logger.log('✅ ServiceLocator initialized');

    // Initialize the app to trigger OnModuleInit lifecycle hooks
    logger.log('🔄 Initializing application modules...');
    await app.init();
    logger.log('✅ Application modules initialized');

    // Get the InngestService and functions from global registry
    logger.log('📋 Getting services and configuration...');

    const inngestService = app.get(InngestService);
    const globalFunctions = GlobalInngestFunctionsRegistry.getFunctions();

    logger.log(`✅ Configuration loaded - System: ${system}, Product: ${product}, Port: ${port}`);

    // app.useGlobalPipes(
    //   new ValidationPipe({
    //     transform: false,
    //     whitelist: true,
    //     forbidNonWhitelisted: true,
    //   }),
    // );

    // Setup Swagger documentation
    setupSwaggerDocumentation(app, system, product);

    // Register Inngest functions with Fastify
    logger.log('🔌 Registering Inngest functions...');
    await fastifyInstance.register(inngestFastify as any, {
      client: inngestService.getInngestClient(),
      functions: globalFunctions, // Use global registry to get all registered functions
    });
    logger.log(
      `✅ Inngest functions registered (${globalFunctions.length} functions)`,
    );


    logger.log(
      `🚀 Starting ${system} API server for ${product} on port ${port}`,
    );
    await app.listen(port, '0.0.0.0');
    logger.log(`✅ API server started successfully on port ${port}`);
    logger.log(`📖 Swagger docs available at: http://localhost:${port}/api`);
  } catch (error) {
    // Log specific error types for better debugging
    logger.error('❌ Failed to start application:', error.message);
    logger.error('Stack trace:', error.stack);
    if (error.message.includes('EADDRINUSE')) {
      logger.error(
        `🚫 Port ${process.env.PORT || '8080'} is already in use. Please check if another process is running on this port.`,
      );
    } else if (error.message.includes('ECONNREFUSED')) {
      logger.error(
        '🚫 Database connection refused. Please check your DATABASE_URL and ensure PostgreSQL is running.',
      );
    } else if (error.message.includes('MODULE_NOT_FOUND')) {
      logger.error(
        '🚫 Module not found. Please run "pnpm install" to install dependencies.',
      );
    }
    process.exit(1);
  }
}

const enableCluster = process.env.CLUSTER_MODE === 'true';
logger.log(`🔧 Cluster mode: ${enableCluster ? 'enabled' : 'disabled'}`);

if (enableCluster) {
  ClusterModule.clusterize(bootstrap, true);
} else {
  bootstrap().catch((err) => {
    logger.error('❌ Bootstrap failed:', err.message);
    logger.error('Stack:', err.stack);
    writeFileSync('graph.json', PartialGraphHost.toString() ?? '');
    process.exit(1);
  });
}
