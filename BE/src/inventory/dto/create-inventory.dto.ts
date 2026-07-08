import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { InventoryStatus } from '@prisma/client';

export class CreateInventoryDto {
  @IsString()
  itemName: string;

  @IsString()
  category: string;

  @IsDateString()
  purchaseDate: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsString()
  amount: string;

  @IsString()
  location: string;

  @IsEnum(InventoryStatus)
  @IsOptional()
  status?: InventoryStatus;

  @IsUUID()
  @IsOptional()
  assignedUserId?: string;
}
