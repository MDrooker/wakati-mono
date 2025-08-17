import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { TypeormInstrumentation } from 'opentelemetry-instrumentation-typeorm';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);

// const traceExporter = new OTLPTraceExporter({
//     url: 'http://otel-collector:4318/v1/traces',
// });
// New Relic OTLP configuration
const exporterOptions = {
  url: 'https://otlp.nr-data.net',
  headers: {
    'api-key':
      process.env.NEW_RELIC_LICENSE_KEY || 'YOUR_NEW_RELIC_LICENSE_KEY_HERE',
  },
};

const traceExporter = new OTLPTraceExporter(exporterOptions);
// Use BatchSpanProcessor for better performance in production
const spanProcessor = new BatchSpanProcessor(traceExporter);
const otelSDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'sparrow-api',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    'service.environment': process.env.NODE_ENV || 'development',
  }),
  spanProcessors: [spanProcessor],
  contextManager: new AsyncLocalStorageContextManager(),
  instrumentations: [
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
    }),
    new NestInstrumentation(),
    new TypeormInstrumentation({
      // see under for available configuration
    }),
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-graphql': {
        enabled: true,
        mergeItems: true,
        depth: -1,
        allowValues: true,
      },
    }),
  ],
});

process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log('Error shutting down SDK', err),
    )
    .finally(() => process.exit(0));
});
export default otelSDK;
