import { IsOptional, IsString, IsArray, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class BrowseQueryDto extends PaginationQueryDto {
  @IsIn(['peers', 'studyRooms'])
  tab: 'peers' | 'studyRooms';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Handle both single values and arrays
    if (typeof value === 'string') {
      return [value];
    }
    return value;
  })
  skills?: string[];
}


