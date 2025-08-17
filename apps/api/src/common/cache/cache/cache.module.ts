import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { Cacheable, KeyvCacheableMemory } from 'cacheable';
import KeyvRedis, { createKeyv } from '@keyv/redis';
import { Keyv } from 'keyv';
import { CacheableMemory } from 'cacheable';
@Module({
  imports: [
    ConfigModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      provide: CACHE_MANAGER,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Lets build the namespace based on the environment
        const env = configService.get<string>('ENVIRONMENT')
          ? configService.get<string>('ENVIRONMENT')
          : 'dev';
        const system = configService.get<string>('SYSTEM');
        const product = configService.get<string>('PRODUCT');
        const redisURI = configService.get<string>('REDIS_URL');
        const nameSpace = `${system}:${product}:${env}:cache`;
        const redisCache = createKeyv(redisURI);

        // return {
        //     isGlobal: true,
        //     store: returnCachable,
        //     ttl: 60 * 1000 * 10, // or your preferred default TTL
        //     max: 10000,
        // };
        return {
          refreshThreshold: 1000,
          isGlobal: true,
          ttl: 60 * 1000 * 1,
          max: 10000,
          stores: [
            new Keyv({
              namespace: nameSpace,
              store: new KeyvCacheableMemory({
                ttl: 10 * 1000,
                lruSize: 5000,
                checkInterval: 5 * 1000,
              }),
            }),
            new Keyv({
              namespace: nameSpace,
              store: new KeyvRedis(redisURI, {
                namespace: nameSpace,
              }),
            }),
          ],
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class Cache {}
