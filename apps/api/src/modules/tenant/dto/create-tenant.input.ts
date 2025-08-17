import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsUrl } from 'class-validator';

@InputType()
export class CreateTenantInput {
  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  domain?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  settings?: any;
}
