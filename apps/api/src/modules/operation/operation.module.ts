import { Module } from '@nestjs/common';
import { OperationService } from './operation.service';
import { OperationResolver } from './operation.resolver';
import { OperationController } from './operation.controller';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  providers: [OperationService, OperationResolver],
  controllers: [OperationController],
})
export class OperationModule {}
