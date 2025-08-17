import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

import { TenantService } from './tenant.service';
import { JwtAuthGuard } from 'src/common/auth/guards/jwt.guard';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  async create(@Body() createTenantDto: CreateTenantDto) {
    const tenant = await this.tenantService.create(createTenantDto);

    return {
      success: true,
      data: tenant,
      message: 'Tenant created successfully',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tenants' })
  @ApiResponse({ status: 200, description: 'Tenants retrieved successfully' })
  @ApiQuery({ name: 'tenanturn', required: false })
  async findAll(@Query('tenanturn') tenanturn?: string) {
    const tenants = await this.tenantService.findAll();

    return {
      success: true,
      data: tenants,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific tenant' })
  @ApiResponse({ status: 200, description: 'Tenant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiQuery({ name: 'tenanturn', required: false })
  async findOne(
    @Param('id') id: string,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const tenant = await this.tenantService.findOne(id);

    return {
      success: true,
      data: tenant,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiQuery({ name: 'tenanturn', required: false })
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const tenant = await this.tenantService.update(id, updateTenantDto);

    return {
      success: true,
      data: tenant,
      message: 'Tenant updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiQuery({ name: 'tenanturn', required: false })
  async remove(
    @Param('id') id: string,
    @Query('tenanturn') tenanturn?: string,
  ) {
    await this.tenantService.remove(id);

    return {
      success: true,
      message: 'Tenant deleted successfully',
    };
  }
}
