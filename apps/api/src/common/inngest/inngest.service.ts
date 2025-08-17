import { sign } from 'crypto';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { Inngest } from 'inngest';
import type { InngestModuleOptions } from './interfaces/inngest-options.interface';
import { INNGEST_OPTIONS } from './inngest.constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InngestService implements OnModuleInit {
  private inngest: Inngest;
  private functions = [];
  private readonly logger = new Logger(InngestService.name);
  constructor(
    @Inject(INNGEST_OPTIONS) private readonly options: InngestModuleOptions,
    private readonly configService: ConfigService, // Replace with actual config service type
  ) {
    const system = this.configService.get<string>('SYSTEM') || 'rockwell';
    const product = this.configService.get<string>('PRODUCT') || 'api';

    // Create Inngest client configuration
    const inngestConfig: any = {
      id: `${system}:${product}`,
      apiKey: options.apiKey,
      isDev: options.isDev || false,
      eventKey: options.eventKey,
      signingKey: options.signingKey,
    };

    // Add custom logger if provided
    if (options.logger) {
      inngestConfig.logger = options.logger;
    }

    this.inngest = new Inngest(inngestConfig);
  }

  onModuleInit() {
    this.logger.log('Inngest service module initialized');
  }

  getInngestClient(): Inngest {
    return this.inngest;
  }

  registerFunction(fn: any) {
    this.functions.push(fn);
    return fn;
  }
  getFunctions() {
    return this.functions;
  }

  async sendEvent<T>(eventName: string, data: T, user?: { id: string }) {
    return this.inngest.send({
      name: eventName,
      data,
      user,
    });
  }
}
