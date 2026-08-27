import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsObject, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';

export class SyncMutationDto {
  @IsUUID() mutationId: string;
  @IsString() @MaxLength(100) entityType: string;
  @IsUUID() entityId: string;
  @IsIn(['create', 'update', 'delete']) operation: 'create' | 'update' | 'delete';
  @IsInt() @Min(0) baseVersion: number;
  @IsDateString() occurredAt: string;
  @IsObject() payload: Record<string, unknown>;
}

export class PushSyncDto {
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => SyncMutationDto)
  mutations: SyncMutationDto[];
}

