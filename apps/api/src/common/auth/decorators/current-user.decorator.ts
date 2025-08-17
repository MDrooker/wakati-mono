import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategy/jwt.strategy';

/**
 * Decorator to extract the current user from the request
 * Use this in controllers to get the authenticated user data
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
