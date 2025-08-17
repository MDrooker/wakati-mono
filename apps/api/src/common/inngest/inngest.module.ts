import {
  type DynamicModule,
  Global,
  Module,
  type Provider,
} from '@nestjs/common';
import { InngestService } from './inngest.service';
import { INNGEST_OPTIONS } from './inngest.constants';
import type { InngestModuleOptions } from './interfaces/inngest-options.interface';

@Global()
@Module({})
export class InngestModule {
  static forRoot(options: InngestModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: INNGEST_OPTIONS,
      useValue: options,
    };
    return {
      module: InngestModule,
      providers: [optionsProvider, InngestService],
      exports: [InngestService, INNGEST_OPTIONS],
    };
  }
}
