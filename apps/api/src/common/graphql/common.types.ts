import { Field, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Translation {
  @Field()
  language?: string;
  @Field()
  value?: string;
}

@InputType()
export class TranslationInput {
  @Field()
  language?: string;

  @Field()
  value?: string;
}

@ObjectType()
export class RichLanguageItemSchema {
  @Field()
  language: string;
  @Field()
  default: string;
  @Field()
  schemaNamespace: string;
  @Field()
  schemaLookupurn: string;
  @Field((_type) => [Translation])
  translations: [Translation];
}

@InputType()
export class RichLanguageItemSchemaInput {
  @Field()
  language: string;

  @Field()
  default: string;

  @Field()
  schemaNamespace: string;

  @Field()
  schemaLookupurn: string;

  @Field((_type) => [TranslationInput])
  translations: [TranslationInput];
}

@ObjectType()
export class Annotations {
  @Field()
  height: number;

  @Field()
  width: number;

  @Field()
  top: number;

  @Field()
  left: number;

  @Field((type) => [String])
  attributes: [string];
}

@InputType()
export class AnnotationsInput {
  @Field()
  height: number;

  @Field()
  width: number;

  @Field()
  top: number;

  @Field()
  left: number;

  @Field((type) => [String])
  attributes: [string];
}

@ObjectType()
export class RelatedMediaItemSchema {
  @Field()
  name: string;

  @Field()
  type: string;

  @Field()
  aspectRatio: string;

  @Field()
  height: number;

  @Field()
  width: number;

  @Field()
  xOffset: number;

  @Field()
  yOffset: number;

  @Field()
  url: string;

  @Field((type) => [Annotations])
  annotations: [Annotations];
}

@InputType()
export class RelatedMediaItemSchemaInput {
  @Field()
  name: string;

  @Field()
  type: string;

  @Field()
  aspectRatio: string;

  @Field()
  height: number;

  @Field()
  width: number;

  @Field()
  xOffset: number;

  @Field()
  yOffset: number;

  @Field()
  url: string;

  @Field((type) => [AnnotationsInput])
  annotations: [Annotations];
}

@ObjectType()
export class StorageLocation {
  @Field()
  region: string;

  @Field()
  provider: string;

  @Field()
  arn: string;

  @Field()
  name: string;

  @Field()
  baseDomain: string;

  @Field()
  keyNamePrefix: string;

  @Field()
  keyName: string;

  @Field()
  keyNameTemplate: string;

  @Field()
  fullKeyName: string;

  @Field()
  publicFullKeyName: string;

  @Field()
  bucketurn: string;

  @Field()
  bucketPath: string;

  @Field()
  isPrivate: boolean;
}
@InputType()
export class StorageLocationInput {
  @Field()
  region: string;

  @Field()
  provider: string;

  @Field()
  arn: string;

  @Field()
  name: string;

  @Field()
  baseDomain: string;

  @Field()
  keyNamePrefix: string;

  @Field()
  keyName: string;

  @Field()
  keyNameTemplate: string;

  @Field()
  fullKeyName: string;

  @Field()
  publicFullKeyName: string;

  @Field()
  bucketurn: string;

  @Field()
  bucketPath: string;

  @Field()
  isPrivate: boolean;
}
