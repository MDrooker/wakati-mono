import { ApiProperty } from '@nestjs/swagger';
import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeUpdate,
  BeforeInsert,
  Entity,
  BaseEntity as TypeOrmBaseEntity,
  ManyToOne,
} from 'typeorm';

export abstract class BaseEntity extends TypeOrmBaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  tenanturn: string;

  @Column({ default: true, nullable: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}

export class RelatedMedia {
  @ApiProperty()
  name: string;

  @ApiProperty()
  platform: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: () => [RelatedMediaItem] })
  media: [RelatedMediaItem];
}

export class RelatedMediaItem {
  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  aspectRatio: string;

  @ApiProperty()
  height: number;

  @ApiProperty()
  width: number;

  @ApiProperty()
  url: string;
}

export class MediaAssets {
  @ApiProperty({ type: () => RelatedMedia })
  media: RelatedMedia[];

  @ApiProperty({ type: () => RelatedMediaItem })
  thumbnail: RelatedMediaItem;

  @ApiProperty({ type: () => RelatedMediaItem })
  default: RelatedMediaItem;
}

export class RichLanguageItem {
  @ApiProperty()
  default: string;

  @ApiProperty()
  translations: [
    {
      language: string;
      value: string;
    },
  ];
}

export class Location {
  @ApiProperty()
  center: {
    lat: number;
    long: number;
  };
  @ApiProperty()
  validRadius: number;
}
