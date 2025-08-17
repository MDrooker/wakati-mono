// auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Public = () => SetMetadata('isPublic', true);

@Injectable()
export class BearerTokenGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    const token = authHeader.split(' ')[1];

    // Replace this with your actual token validation logic
    if (!this.validateToken(token)) {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private validateToken(token: string): boolean {
    // In a real application, you would verify the token against your authentication service
    // or decode and validate a JWT. For this example, we'll just check for a non-empty string.
    const validToken = this.configService.get<string>('CRUD_API_TOKEN');
    return token === validToken;
  }
}
