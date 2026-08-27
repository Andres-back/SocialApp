import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { ATHLETE_STATUSES, DOCUMENT_TYPES, SEX_OPTIONS, ZONES } from '@socialapp/shared';

class GuardianDto {
  @IsString() @MinLength(2) @MaxLength(160) name: string;
  @IsString() @MinLength(2) @MaxLength(80) relationship: string;
  @IsString() @MinLength(7) @MaxLength(40) phone: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string | null;
}

export class UpsertAthleteDto {
  @IsUUID() id: string;
  @IsString() @MinLength(2) @MaxLength(40) internalCode: string;
  @IsIn(DOCUMENT_TYPES) documentType: (typeof DOCUMENT_TYPES)[number];
  @IsOptional() @IsString() @MaxLength(40) documentNumber?: string | null;
  @IsString() @MinLength(2) @MaxLength(120) firstNames: string;
  @IsString() @MinLength(2) @MaxLength(120) lastNames: string;
  @IsDateString() birthDate: string;
  @IsIn(SEX_OPTIONS) sex: (typeof SEX_OPTIONS)[number];
  @IsString() @MinLength(2) @MaxLength(120) municipality: string;
  @IsIn(ZONES) zone: (typeof ZONES)[number];
  @IsUUID() sportsProgramId: string;
  @IsUUID() sportId: string;
  @IsUUID() categoryId: string;
  @IsOptional() @IsUUID() coachId?: string | null;
  @IsDateString() joinedAt: string;
  @IsIn(ATHLETE_STATUSES) status: (typeof ATHLETE_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(180) schoolName?: string | null;
  @IsOptional() @IsString() @MaxLength(40) schoolGrade?: string | null;
  @IsOptional() @IsString() @MaxLength(40) schoolShift?: string | null;
  @IsBoolean() currentlyEnrolled: boolean;
  @ValidateNested() @Type(() => GuardianDto) guardian: GuardianDto;
  @IsInt() @Min(0) version: number;
}
