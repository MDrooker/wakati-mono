import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): any {
    debugger;
    let payload = context.getArgByIndex(0);
    payload = payload.imageOption;
    context[0] = payload;
    return next;
  }
}
