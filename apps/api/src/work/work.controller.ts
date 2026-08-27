import { Body, Controller, Get, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { PERMISSIONS, type AlertData, type FollowUpCaseInput, type FollowUpEntryInput, type NetworkDiagramData, type ProfessionalObservationData, type SocioeconomicAssessmentInput } from '@socialapp/shared';
import type { Request } from 'express';
import type { RequestUser } from '../iam/authenticated-user';
import { RequirePermissions } from '../iam/permissions.decorator';
import { WorkService } from './work.service';

@Controller()
export class WorkController {
  constructor(private readonly work: WorkService) {}

  @Get('athletes/:athleteId/workspace')
  @RequirePermissions(PERMISSIONS.SOCIAL_RECORD_READ, PERMISSIONS.FOLLOW_UP_READ)
  workspace(@Param('athleteId') athleteId: string, @Req() request: Request & { user: RequestUser }) {
    return this.work.workspace(athleteId, request.user.id);
  }

  @Put('athletes/:athleteId/socioeconomic-assessment')
  @RequirePermissions(PERMISSIONS.ASSESSMENT_WRITE)
  saveAssessment(@Param('athleteId') athleteId: string, @Body() body: SocioeconomicAssessmentInput, @Req() request: Request & { user: RequestUser }) {
    return this.work.upsertAssessment(request.user.id, { ...body, athleteId }, body.version);
  }

  @Post('athletes/:athleteId/alerts')
  @RequirePermissions(PERMISSIONS.ALERT_WRITE)
  createAlert(@Param('athleteId') athleteId: string, @Body() body: AlertData, @Req() request: Request & { user: RequestUser }) {
    return this.work.upsertAlert(request.user.id, { ...body, athleteId }, body.version);
  }

  @Patch('alerts/:id')
  @RequirePermissions(PERMISSIONS.ALERT_WRITE)
  updateAlert(@Param('id') id: string, @Body() body: Partial<AlertData> & { version: number }, @Req() request: Request & { user: RequestUser }) {
    return this.work.updateAlert(request.user.id, id, body);
  }

  @Post('athletes/:athleteId/follow-ups')
  @RequirePermissions(PERMISSIONS.FOLLOW_UP_WRITE)
  createFollowUp(@Param('athleteId') athleteId: string, @Body() body: FollowUpCaseInput, @Req() request: Request & { user: RequestUser }) {
    return this.work.upsertFollowUp(request.user.id, { ...body, athleteId }, body.version);
  }

  @Patch('follow-ups/:id')
  @RequirePermissions(PERMISSIONS.FOLLOW_UP_WRITE)
  updateFollowUp(@Param('id') id: string, @Body() body: Partial<FollowUpCaseInput> & { version: number }, @Req() request: Request & { user: RequestUser }) {
    return this.work.updateFollowUp(request.user.id, id, body);
  }

  @Post('follow-ups/:id/entries')
  @RequirePermissions(PERMISSIONS.FOLLOW_UP_WRITE)
  addFollowUpEntry(@Param('id') id: string, @Body() body: FollowUpEntryInput, @Req() request: Request & { user: RequestUser }) {
    return this.work.addFollowUpEntry(request.user.id, { ...body, followUpCaseId: id });
  }

  @Post('athletes/:athleteId/observations')
  @RequirePermissions(PERMISSIONS.SOCIAL_RECORD_WRITE)
  saveObservation(@Param('athleteId') athleteId: string, @Body() body: ProfessionalObservationData, @Req() request: Request & { user: RequestUser }) {
    return this.work.upsertObservation(request.user.id, { ...body, athleteId });
  }

  @Put('athletes/:athleteId/genogram')
  @RequirePermissions(PERMISSIONS.DIAGRAM_WRITE)
  saveGenogram(@Param('athleteId') athleteId: string, @Body() body: NetworkDiagramData, @Req() request: Request & { user: RequestUser }) {
    return this.work.upsertDiagram(request.user.id, 'genogram', { ...body, athleteId }, body.version);
  }

  @Put('athletes/:athleteId/ecomap')
  @RequirePermissions(PERMISSIONS.DIAGRAM_WRITE)
  saveEcomap(@Param('athleteId') athleteId: string, @Body() body: NetworkDiagramData, @Req() request: Request & { user: RequestUser }) {
    return this.work.upsertDiagram(request.user.id, 'ecomap', { ...body, athleteId }, body.version);
  }
}
