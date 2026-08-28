import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { PERMISSIONS } from '@socialapp/shared';
import type { Request } from 'express';
import type { RequestUser } from '../iam/authenticated-user';
import { RequirePermissions } from '../iam/permissions.decorator';
import { AiReportsService } from './ai-reports.service';

@Controller()
export class AiReportsController {
  constructor(private readonly reports: AiReportsService) {}

  @Get('athletes/:athleteId/ai-reports')
  @RequirePermissions(PERMISSIONS.SOCIAL_RECORD_READ)
  list(@Param('athleteId') athleteId: string) {
    return this.reports.list(athleteId);
  }

  @Post('athletes/:athleteId/ai-reports')
  @RequirePermissions(PERMISSIONS.SOCIAL_RECORD_WRITE)
  generate(
    @Param('athleteId') athleteId: string,
    @Body() body: { participantId?: string },
    @Req() request: Request & { user: RequestUser },
  ) {
    return this.reports.generate(request.user.id, athleteId, body.participantId);
  }

  @Patch('ai-reports/:id/review')
  @RequirePermissions(PERMISSIONS.SOCIAL_RECORD_WRITE)
  review(@Param('id') id: string, @Req() request: Request & { user: RequestUser }) {
    return this.reports.review(request.user.id, id);
  }
}
