import { Injectable } from '@nestjs/common';
import type { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get(key: string): string {
    return this.configService.get<string>(key);
  }

  getNumber(key: string): number {
    const value = this.get(key);
    return value ? Number.parseInt(value, 10) : undefined;
  }

  getBoolean(key: string): boolean {
    const value = this.get(key);
    return value === 'true';
  }
}
