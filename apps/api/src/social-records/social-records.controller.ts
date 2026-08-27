import { Body, Controller, Get, Param, Put, Req } from '@nestjs/common';
import { PERMISSIONS } from '@socialapp/shared';
import type { Request } from 'express';
import type { RequestUser } from '../iam/authenticated-user';
import { RequirePermissions } from '../iam/permissions.decorator';
import { UpsertSocialRecordDto } from './dto/upsert-social-record.dto';
import { SocialRecordsService } from './social-records.service';

@Controller('athletes/:athleteId/social-record')
export class SocialRecordsController {
  constructor(private readonly records: SocialRecordsService) {}

  @Get() @RequirePermissions(PERMISSIONS.SOCIAL_RECORD_READ)
  latest(@Param('athleteId') athleteId: string, @Req() request: Request & { user: RequestUser }) {
    return this.records.latest(athleteId, request.user.id);
  }

  @Put() @RequirePermissions(PERMISSIONS.SOCIAL_RECORD_WRITE)
  upsert(@Param('athleteId') athleteId: string, @Body() dto: UpsertSocialRecordDto, @Req() request: Request & { user: RequestUser }) {
    dto.athleteId = athleteId;
    return this.records.upsert(request.user.id, dto, dto.version);
  }
}
