import { Injectable } from '@nestjs/common';
import { GqlModuleOptions, GqlOptionsFactory } from '@nestjs/graphql';
import { YogaDriver, YogaDriverConfig } from '@graphql-yoga/nestjs';
import { useOpenTelemetry } from '@envelop/opentelemetry';
import { trace } from '@opentelemetry/api';

@Injectable()
export class GraphQLYogaDriverConfigService implements GqlOptionsFactory {
  async createGqlOptions(): Promise<GqlModuleOptions> {
    return {
      driver: YogaDriver,
      autoSchemaFile: 'schema.gql',
      subscription: {
        graphiql: true, // Enable GraphiQL subscriptions UI
      },
      plugins: [
        useOpenTelemetry(
          {
            resolvers: true, // Tracks resolvers calls, and tracks resolvers thrown errors
            variables: true, // Includes the operation variables values as part of the metadata collected
            result: true, // Includes execution result object as part of the metadata collected
          },
          trace.getTracerProvider(),
        ),
      ],
      context: ({ req, res }) => ({ req, res }),
      cors: {
        origin: '*',
        credentials: true,
      },
    } as YogaDriverConfig;
  }
}
