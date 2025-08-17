import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../strategy/jwt.strategy';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserTokenData {
  sub: string;
  userurn: string;
  roles?: string[];
}

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate JWT access token for a user
   */
  async generateToken(userData: UserTokenData): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: userData.sub,
      username: userData.userurn,
      roles: userData.roles || [],
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn,
      secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
    });

    return {
      access_token,
      token_type: 'Bearer',
      expires_in: this.parseExpirationTime(expiresIn),
    };
  }

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') || 'default-secret',
      });
      return payload as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Decode JWT token without verification (use with caution)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse expiration time string to seconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const timeMap: { [key: string]: number } = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }

    const [, value, unit] = match;
    return parseInt(value, 10) * (timeMap[unit] || 3600);
  }
}
