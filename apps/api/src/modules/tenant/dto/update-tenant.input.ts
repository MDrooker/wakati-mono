import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsUrl, IsBoolean } from 'class-validator';

@InputType()
export class UpdateTenantInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

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

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
