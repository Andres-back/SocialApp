import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PERMISSIONS, ROLES } from '@socialapp/shared';
import type { Request } from 'express';
import type { RequestUser } from '../iam/authenticated-user';
import { RequirePermissions } from '../iam/permissions.decorator';
import { AthletesService } from './athletes.service';
import { UpsertAthleteDto } from './dto/upsert-athlete.dto';

@Controller('athletes')
export class AthletesController {
  constructor(private readonly athletes: AthletesService) {}

  @Get() @RequirePermissions(PERMISSIONS.ATHLETE_READ)
  list(@Query('search') search: string | undefined, @Req() request: Request & { user: RequestUser }) {
    return this.athletes.list(search, request.user.roles.includes(ROLES.COACH) ? request.user.displayName : undefined);
  }

  @Get(':id') @RequirePermissions(PERMISSIONS.ATHLETE_READ)
  get(@Param('id') id: string, @Req() request: Request & { user: RequestUser }) {
    return this.athletes.get(id, request.user.id, request.user.roles.includes(ROLES.COACH) ? request.user.displayName : undefined);
  }

  @Post() @RequirePermissions(PERMISSIONS.ATHLETE_WRITE)
  upsert(@Body() dto: UpsertAthleteDto, @Req() request: Request & { user: RequestUser }) {
    return this.athletes.upsert(request.user.id, dto, dto.version);
  }
}
