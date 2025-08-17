import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UserService } from './user.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { trace } from '@opentelemetry/api';
import { Span } from 'nestjs-otel';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/auth/guards/jwt.guard';

@Resolver('User')
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation('createUser')
  createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.userService.create(createUserInput, tenanturn);
  }

  @Span('users.findAll')
  @Query('users')
  @UseGuards(JwtAuthGuard)
  findAll(@Args('tenanturn') tenanturn?: string) {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttribute('resolver.name', 'user');
      currentSpan.setAttribute('resolver.type', 'Query');
    }
    return this.userService.findAll(tenanturn);
  }

  @Query('user')
  @UseGuards(JwtAuthGuard)
  findOne(@Args('id') id: string, @Args('tenanturn') tenanturn?: string) {
    return this.userService.findOne(id, tenanturn);
  }

  @Query('userByEmail')
  @UseGuards(JwtAuthGuard)
  findByEmail(
    @Args('email') email: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.userService.findByEmail(email, tenanturn);
  }

  @Query('userByUserurn')
  findByUserurn(
    @Args('userurn') userurn: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.userService.findByUserurn(userurn, tenanturn);
  }

  @Mutation('updateUser')
  @UseGuards(JwtAuthGuard)
  update(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.userService.update(
      updateUserInput.id,
      updateUserInput,
      tenanturn,
    );
  }

  @Mutation('removeUser')
  @UseGuards(JwtAuthGuard)
  remove(@Args('id') id: string) {
    return this.userService.remove(id);
  }

  @Mutation('verifyUser')
  @UseGuards(JwtAuthGuard)
  verifyUser(@Args('id') id: string) {
    return this.userService.verifyUser(id);
  }

  @Mutation('unverifyUser')
  @UseGuards(JwtAuthGuard)
  unverifyUser(@Args('id') id: string) {
    return this.userService.unverifyUser(id);
  }
}
