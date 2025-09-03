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
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { customAlphabet } from 'nanoid';
import { BaseEntity } from 'src/common/database/entities/base.entity';

const nanoid = customAlphabet('1234567890abcdef', 5);
const applicationName = process.env.SYSTEM || 'wakati';
const companyName = process.env.COMPANY || 'weather';
@Entity('user', { schema: applicationName })
export class User extends BaseEntity {
  @Column()
  @Index({ unique: true })
  userurn: string;

  @Column()
  @Index({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  website: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;


  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  supabaseUserId: string;

  @ManyToOne('Tenant', (tenant: any) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenanturn', referencedColumnName: 'tenanturn' })
  tenant: any;

  static generateUserUrn(): string {
    return `${companyName}:${applicationName}.user:${nanoid()}`;
  }
  @BeforeUpdate()
  @BeforeInsert()
  async persistHook(): Promise<void> {
    if (
      this.userurn === undefined ||
      this.userurn === null ||
      this.userurn === ''
    ) {
      this.userurn = User.generateUserUrn();
    }

    if (!this.displayName && this.firstName && this.lastName) {
      this.displayName = `${this.firstName} ${this.lastName}`;
    }
  }
}
