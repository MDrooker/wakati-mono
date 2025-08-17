import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant name', example: 'My Organization' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Tenant description',
    example: 'A description of the organization',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Tenant domain',
    example: 'myorg.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({
    description: 'Tenant logo URL',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiProperty({
    description: 'Tenant settings',
    example: { theme: 'dark' },
    required: false,
  })
  @IsOptional()
  settings?: any;
}
