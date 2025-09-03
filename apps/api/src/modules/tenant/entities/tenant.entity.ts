import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BeforeUpdate,
  BeforeInsert,
  CreateDateColumn,
  Index,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { customAlphabet } from 'nanoid';
import { BaseEntity } from 'src/common/database/entities/base.entity';

const nanoid = customAlphabet('1234567890abcdef', 5);
const companyName = process.env.COMPANY || 'weather';
const applicationName = process.env.SYSTEM || 'thoth';
@Entity('tenant', { schema: applicationName })
export class Tenant extends BaseEntity {
  @Column()
  @Index({ unique: true })
  tenanturn: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: any;

  @Column({ default: true })
  isActive: boolean;

  // @OneToMany('User', (user: any) => user.tenant)
  // users: any[];


  static generateTenanturn(): string {
    return `${companyName}:${applicationName}.tenant:${nanoid()}`;
  }

  @BeforeUpdate()
  @BeforeInsert()
  async persistHook(): Promise<void> {
    if (
      this.tenanturn === undefined ||
      this.tenanturn === null ||
      this.tenanturn === ''
    ) {
      this.tenanturn = Tenant.generateTenanturn();
    }
  }
}
