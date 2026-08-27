import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { PERMISSIONS, type ScreeningCampaignInput } from '@socialapp/shared';
import type { Request } from 'express';
import type { RequestUser } from '../iam/authenticated-user';
import { RequirePermissions } from '../iam/permissions.decorator';
import { CampaignsService, type ScreeningResultInput } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get('instruments')
  @RequirePermissions(PERMISSIONS.SCREENING_READ)
  instruments() { return this.campaigns.instruments(); }

  @Get()
  @RequirePermissions(PERMISSIONS.SCREENING_READ)
  list() { return this.campaigns.list(); }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SCREENING_READ)
  detail(@Param('id') id: string) { return this.campaigns.detail(id); }

  @Post()
  @RequirePermissions(PERMISSIONS.SCREENING_WRITE)
  save(@Body() body: ScreeningCampaignInput, @Req() request: Request & { user: RequestUser }) {
    return this.campaigns.upsert(request.user.id, body, body.version);
  }

  @Put(':campaignId/participants/:athleteId')
  @RequirePermissions(PERMISSIONS.SCREENING_WRITE)
  saveResult(@Param('campaignId') campaignId: string, @Param('athleteId') athleteId: string, @Body() body: ScreeningResultInput, @Req() request: Request & { user: RequestUser }) {
    return this.campaigns.saveResult(request.user.id, { ...body, campaignId, athleteId });
  }
}
