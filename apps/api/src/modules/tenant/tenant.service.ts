import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) { }

  static generateTenanturn(): string {
    return Tenant.generateTenanturn();
  }

  async create(input: CreateTenantDto): Promise<Tenant> {
    const existingTenant = await this.tenantRepository.findOne({
      where: { name: input.name },
    });

    if (existingTenant) {
      throw new ConflictException('Tenant with this name already exists');
    }

    const tenant = this.tenantRepository.create(input);
    return this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async findByTenanturn(tenanturn: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({
      where: { tenanturn },
    });
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({
      where: { domain },
    });
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (updateTenantDto.name && updateTenantDto.name !== tenant.name) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { name: updateTenantDto.name },
      });

      if (existingTenant) {
        throw new ConflictException('Tenant with this name already exists');
      }
    }

    await this.tenantRepository.update(id, updateTenantDto);
    return this.tenantRepository.findOne({ where: { id: parseInt(id) } });
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.tenantRepository.update(id, { isActive: false });
  }

  async findAllWithPagination(
    filter?: any,
    pagination?: PaginationArgs,
    sort?: SortArgs,
  ): Promise<ConnectionResult<Tenant>> {
    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant');

    queryBuilder.andWhere('tenant.isActive = :isActive', { isActive: true });

    if (filter?.search) {
      queryBuilder.andWhere(
        '(tenant.name ILIKE :search OR tenant.description ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    return applyCursorPagination(
      queryBuilder,
      pagination || { first: 20 },
      sort || { field: 'createdAt', direction: 'DESC' },
    );
  }
}
