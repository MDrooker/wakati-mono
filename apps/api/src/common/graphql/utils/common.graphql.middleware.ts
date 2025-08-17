import { Injectable, type NestMiddleware } from '@nestjs/common';

import { trace, context, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class GraphQLTracingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: FastifyResponse) {
    // Only trace GraphQL operations
    if (req.path !== '/graphql') {
      return next();
    }

    const tracer = trace.getTracer('graphql-middleware');

    // Create a span for the entire GraphQL request
    const span = tracer.startSpan('graphql.request');

    // Add request details to the span
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.url', req.originalUrl);

    // If there's a GraphQL operation name in the request, add it to the span
    if (req.body && req.body.operationName) {
      span.setAttribute('graphql.operation.name', req.body.operationName);
    }

    // If there's a GraphQL query in the request, add it to the span
    if (req.body && req.body.query) {
      span.setAttribute('graphql.query', req.body.query);
    }

    // Execute the request within the context of this span
    context.with(trace.setSpan(context.active(), span), () => {
      // Capture the response status
      const originalEnd = res.end;
      res.end = (...args) => {
        span.setAttribute('http.status_code', res.statusCode);

        if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`,
          });
        }

        span.end();
        return originalEnd.apply(res, args);
      };

      next();
    });
  }
}
