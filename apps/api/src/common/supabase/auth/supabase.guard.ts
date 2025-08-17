import { config } from './../../../../../mainsite/src/middleware';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { FastifyRequestType } from 'fastify/types/type-provider';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}
  getRequest(context: ExecutionContext) {
    // Detect if it's a GraphQL or REST request
    if (context.getType() === 'http') {
      // REST request
      return context.switchToHttp().getRequest();
    } else {
      // GraphQL request
      const ctx = GqlExecutionContext.create(context);
      return ctx.getContext().req;
    }
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context) as FastifyRequestType;
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(), // Check for metadata on the handler (resolver method)
    );

    if (isPublic) {
      return true; // Skip the guard if the decorator is present
    }
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    const tokenOverride = this.configService.get('SUPABASE_TOKEN_OVERRIDE');
    const user = await this.supabaseService.verifyToken(token);
    if (!user && !tokenOverride) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    if (tokenOverride && !user) {
      console.log('Testing token override');
      const matchedToken = token === tokenOverride;
      return matchedToken;
    }
    request['user'] = user;
    return true;
  }

  private extractTokenFromHeader(
    request: FastifyRequestType,
  ): string | undefined {
    // debugger
    const authHeader = (request.headers as Record<string, string | undefined>)
      ?.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
