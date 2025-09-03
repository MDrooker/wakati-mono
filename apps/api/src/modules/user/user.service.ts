import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { TenantContextService } from '../tenant/services/tenant-context.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tenantContextService: TenantContextService,
  ) { }

  // Static method to generate User URN
  static generateUserUrn(): string {
    return User.generateUserUrn();
  }

  async create(input: CreateUserDto, tenanturn?: string): Promise<User> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    // Check if user with email already exists within the tenant
    const whereCondition: any = { email: input.email };
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    const existingUser = await this.userRepository.findOne({
      where: whereCondition,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = this.userRepository.create({
      ...input,
      tenanturn: resolvedTenanturn,
    });
    return this.userRepository.save(user);
  }

  async findAll(tenanturn?: string): Promise<User[]> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);
    const whereCondition: any = { isActive: true };

    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    return this.userRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenanturn?: string): Promise<User> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);
    const whereCondition: any = { id: parseInt(id) };

    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    const user = await this.userRepository.findOne({
      where: whereCondition,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string, tenanturn?: string): Promise<User | null> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);
    const whereCondition: any = { email };

    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    return this.userRepository.findOne({
      where: whereCondition,
    });
  }

  async findByUserurn(
    userurn: string,
    tenanturn?: string,
  ): Promise<User | null> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);
    const whereCondition: any = { userurn };

    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    return this.userRepository.findOne({
      where: whereCondition,
    });
  }

  async findBySupabaseUserId(
    supabaseUserId: string,
    tenanturn?: string,
  ): Promise<User | null> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);
    const whereCondition: any = { supabaseUserId };

    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    return this.userRepository.findOne({
      where: whereCondition,
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    tenanturn?: string,
  ): Promise<User> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);
    const whereCondition: any = { id: parseInt(id) };

    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    const user = await this.userRepository.findOne({
      where: whereCondition,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and if it's already taken within the tenant
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailWhereCondition: any = { email: updateUserDto.email };
      if (resolvedTenanturn) {
        emailWhereCondition.tenanturn = resolvedTenanturn;
      }

      const existingUser = await this.userRepository.findOne({
        where: emailWhereCondition,
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    await this.userRepository.update(id, updateUserDto);
    return this.userRepository.findOne({ where: whereCondition });
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by setting isActive to false
    await this.userRepository.update(id, { isActive: false });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }


  async verifyUser(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(id, { isVerified: true });
    return this.userRepository.findOne({ where: { id: parseInt(id) } });
  }

  async unverifyUser(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(id, { isVerified: false });
    return this.userRepository.findOne({ where: { id: parseInt(id) } });
  }
}
