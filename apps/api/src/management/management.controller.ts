import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { PERMISSIONS } from '@socialapp/shared';
import type { Request, Response } from 'express';
import type { RequestUser } from '../iam/authenticated-user';
import { RequirePermissions } from '../iam/permissions.decorator';
import { ManagementService } from './management.service';

@Controller()
export class ManagementController {
  constructor(private readonly management: ManagementService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.DASHBOARD_AGGREGATE_READ)
  dashboard() { return this.management.dashboard(); }

  @Get('reports/population')
  @RequirePermissions(PERMISSIONS.DASHBOARD_AGGREGATE_READ)
  population(@Query() filters: Record<string, string>) { return this.management.populationReport(filters); }

  @Get('reports/athletes/:athleteId')
  @RequirePermissions(PERMISSIONS.SOCIAL_RECORD_READ)
  individual(@Param('athleteId') athleteId: string, @Req() request: Request & { user: RequestUser }) {
    return this.management.individualReport(athleteId, request.user.id);
  }

  @Get('reports/population.csv')
  @RequirePermissions(PERMISSIONS.REPORT_EXPORT)
  async csv(@Query() filters: Record<string, string>, @Req() request: Request & { user: RequestUser }, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="reporte-poblacional.csv"');
    return this.management.populationCsv(filters, request.user.id);
  }

  @Post('reports/export-audit')
  @RequirePermissions(PERMISSIONS.REPORT_EXPORT)
  auditExport(@Body() body: { type: string; athleteId?: string }, @Req() request: Request & { user: RequestUser }) {
    return this.management.auditExport(request.user.id, body);
  }

  @Get('admin/overview')
  @RequirePermissions(PERMISSIONS.ADMIN_USERS, PERMISSIONS.ADMIN_CATALOGS)
  adminOverview() { return this.management.adminOverview(); }

  @Post('admin/catalogs/:kind')
  @RequirePermissions(PERMISSIONS.ADMIN_CATALOGS)
  catalog(@Param('kind') kind: string, @Body() body: { name: string }, @Req() request: Request & { user: RequestUser }) {
    return this.management.createCatalog(request.user.id, kind, body.name);
  }

  @Get('catalogs/manage')
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  catalogOverview() { return this.management.catalogOverview(); }

  @Post('catalogs/:kind')
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  createOperationalCatalog(@Param('kind') kind: string, @Body() body: { name: string }, @Req() request: Request & { user: RequestUser }) {
    return this.management.createCatalog(request.user.id, kind, body.name);
  }

  @Patch('catalogs/:kind/:id')
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  updateOperationalCatalog(@Param('kind') kind: string, @Param('id') id: string, @Body() body: { name?: string; active?: boolean }, @Req() request: Request & { user: RequestUser }) {
    return this.management.updateCatalog(request.user.id, kind, id, body);
  }

  @Post('admin/rules')
  @RequirePermissions(PERMISSIONS.ADMIN_CATALOGS)
  rule(@Body() body: Record<string, unknown>, @Req() request: Request & { user: RequestUser }) {
    return this.management.saveRule(request.user.id, body);
  }

  @Post('admin/instruments')
  @RequirePermissions(PERMISSIONS.ADMIN_CATALOGS)
  instrument(@Body() body: Record<string, unknown>, @Req() request: Request & { user: RequestUser }) {
    return this.management.saveInstrument(request.user.id, body);
  }

  @Get('instruments/manage')
  @RequirePermissions(PERMISSIONS.SCREENING_WRITE)
  instruments() { return this.management.instrumentOverview(); }

  @Post('instruments')
  @RequirePermissions(PERMISSIONS.SCREENING_WRITE)
  saveOperationalInstrument(@Body() body: Record<string, unknown>, @Req() request: Request & { user: RequestUser }) {
    return this.management.saveInstrument(request.user.id, body);
  }

  @Patch('instruments/:id')
  @RequirePermissions(PERMISSIONS.SCREENING_WRITE)
  updateInstrumentStatus(@Param('id') id: string, @Body() body: { active: boolean }, @Req() request: Request & { user: RequestUser }) {
    return this.management.updateInstrumentStatus(request.user.id, id, body.active);
  }

  @Post('admin/users')
  @RequirePermissions(PERMISSIONS.ADMIN_USERS)
  user(@Body() body: { email: string; displayName: string; password: string; roles: string[] }, @Req() request: Request & { user: RequestUser }) {
    return this.management.createUser(request.user.id, body);
  }

  @Patch('admin/users/:id/status')
  @RequirePermissions(PERMISSIONS.ADMIN_USERS)
  userStatus(@Param('id') id: string, @Body() body: { status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' }, @Req() request: Request & { user: RequestUser }) {
    return this.management.updateUserStatus(request.user.id, id, body.status);
  }
}
