import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VotePostDto {
  @ApiProperty({
    description: 'Vote value: 1 for upvote, -1 for downvote, 0 to remove vote',
    example: 1,
    enum: [-1, 0, 1],
  })
  @IsNotEmpty()
  @IsNumber()
  vote: -1 | 0 | 1;
}

export class PublishPostDto {
  @ApiProperty({
    description:
      'Whether to publish the post immediately after moderation approval',
    example: true,
    default: true,
  })
  @IsOptional()
  publishImmediately?: boolean = true;
}
