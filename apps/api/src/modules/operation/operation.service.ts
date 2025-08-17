import { ConfigService } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';
import { CreateOperationRequestInput } from 'src/graphql.schema';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Keyv from 'keyv';
@Injectable()
export class OperationService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async getActiveKeys() {
    const keys = [];
    const stores: Keyv<any>[] = this.cacheManager.stores;
    const keyResults = Promise.all(
      stores.map(async (store) => {
        const storeType = store.constructor.name;
        if (store?.iterator) {
          for await (const [key, value] of store.iterator({})) {
            const builtInKey = `${storeType}:${key}`;
            keys.push(`${storeType}:${key}`);
            return builtInKey;
          }
        }
      }),
    );

    return keyResults;
  }

  async createOperationRequest({
    createOperationRequestInput,
  }: {
    createOperationRequestInput: CreateOperationRequestInput;
  }) {
    const { type, payload, value } = createOperationRequestInput;
    let operationResponse;
    switch (type) {
      case 'keys':
        const keyData = await this.getActiveKeys();
        return {
          status: true,
          message: {
            keys: keyData,
          },
        };
        break;
      default:
        break;
    }
    return {
      status: true,
      message: {
        time: new Date().getTime(),
      },
    };
  }
}
