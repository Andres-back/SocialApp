import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

const qualities = ['CLOSE', 'ADEQUATE', 'DISTANT', 'CONFLICTIVE', 'UNKNOWN'] as const;
const ratings = ['VERY_GOOD', 'GOOD', 'REGULAR', 'DIFFICULT'] as const;
const caregivers = ['MOTHER', 'FATHER', 'BOTH', 'GRANDPARENT', 'OTHER_RELATIVE', 'OTHER'] as const;

class HouseholdMemberDto {
  @IsUUID() id: string;
  @IsString() @MinLength(2) @MaxLength(160) name: string;
  @IsString() @MinLength(2) @MaxLength(80) relationship: string;
  @IsOptional() @IsInt() @Min(0) @Max(120) approximateAge?: number | null;
  @IsBoolean() livesWithAthlete: boolean;
  @IsOptional() @IsString() @MaxLength(120) occupation?: string | null;
  @IsIn(qualities) relationshipQuality: (typeof qualities)[number];
}

export class UpsertSocialRecordDto {
  @IsUUID() id: string;
  @IsUUID() athleteId: string;
  @IsInt() @Min(1) instrumentVersion: number;
  @IsIn(['DRAFT', 'COMPLETED']) status: 'DRAFT' | 'COMPLETED';
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) livingWith: string[];
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => HouseholdMemberDto) householdMembers: HouseholdMemberDto[];
  @IsIn(caregivers) primaryCaregiver: (typeof caregivers)[number];
  @IsOptional() @IsString() @MaxLength(120) otherCaregiver?: string | null;
  @IsIn(ratings) familyRelationships: (typeof ratings)[number];
  @IsArray() @ArrayMaxSize(15) @IsString({ each: true }) supportNetworks: string[];
  @IsOptional() @IsString() @MaxLength(160) otherSupportNetwork?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) professionalObservation?: string | null;
  @IsOptional() @IsDateString() completedAt?: string | null;
  @IsInt() @Min(0) version: number;
}
