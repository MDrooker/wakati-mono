// auth/strategies/basic.strategy.ts
import { BasicStrategy as Strategy } from 'passport-http';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy, 'basic') {
  constructor(private readonly configService: ConfigService) {
    super({ passReqToCallback: true });
  }

  public async validate(
    req: Request,
    username: string,
    password: string,
  ): Promise<boolean> {
    debugger;
    const validUser = this.configService.get<string>('HTTP_BASIC_USER');
    const validPass = this.configService.get<string>('HTTP_BASIC_PASS');
    if (username === validUser && password === validPass) {
      return true;
    }
    throw new UnauthorizedException();
  }
}
