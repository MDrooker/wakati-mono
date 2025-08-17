import { INestApplicationContext } from '@nestjs/common';

/**
 * Global service locator for accessing NestJS services from outside the DI container
 * This is primarily used for Inngest functions that run outside of the NestJS context
 */
export class ServiceLocator {
  private static appContext: INestApplicationContext;

  static setAppContext(context: INestApplicationContext) {
    ServiceLocator.appContext = context;
  }

  static getService<T>(serviceClass: new (...args: any[]) => T): T {
    if (!ServiceLocator.appContext) {
      throw new Error(
        'Application context not set. Make sure to call ServiceLocator.setAppContext() on app startup.',
      );
    }
    return ServiceLocator.appContext.get(serviceClass);
  }

  static async getServiceAsync<T>(
    serviceClass: new (...args: any[]) => T,
  ): Promise<T> {
    if (!ServiceLocator.appContext) {
      throw new Error(
        'Application context not set. Make sure to call ServiceLocator.setAppContext() on app startup.',
      );
    }
    return ServiceLocator.appContext.resolve(serviceClass);
  }
}
