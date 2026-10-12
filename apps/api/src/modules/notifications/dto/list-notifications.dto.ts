import { NotificationStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto.js';

export class ListNotificationsDto extends PageOptionsDto {
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;
}
