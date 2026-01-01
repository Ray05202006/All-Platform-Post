import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

export enum Platform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  THREADS = 'threads',
}

export class CreatePostDto {
  @IsString()
  @MaxLength(63206) // Facebook 最大长度
  content: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Platform, { each: true })
  platforms: Platform[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsString()
  mediaType?: 'image' | 'video';

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
