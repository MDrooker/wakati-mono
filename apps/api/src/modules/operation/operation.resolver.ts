import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';

import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { OperationService } from './operation.service';
import { CreateOperationRequestInput, Operation } from 'src/graphql.schema';

@Resolver((of) => Operation)
export class OperationResolver {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly operationService: OperationService,
  ) {}

  @Query((returns) => [Operation])
  getServerTime() {
    return {
      status: true,
      message: {
        time: new Date().getTime(),
      },
    };
  }

  @Mutation((returns) => Operation)
  async createOperationRequest(
    @Args('createOperationRequestInput')
    createOperationRequestInput: CreateOperationRequestInput,
  ): Promise<Operation> {
    try {
      const operationResponse =
        await this.operationService.createOperationRequest({
          createOperationRequestInput,
        });
      return operationResponse;
    } catch (error) {}
  }
}
