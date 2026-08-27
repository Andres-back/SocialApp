import { Body, Controller, Post, Req } from '@nestjs/common';
import { PERMISSIONS } from '@socialapp/shared';
import type { Request } from 'express';
import type { RequestUser } from '../iam/authenticated-user';
import { RequirePermissions } from '../iam/permissions.decorator';
import { PushSyncDto } from './dto/push-sync.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}
  @Post('push') @RequirePermissions(PERMISSIONS.SYNC_EXECUTE)
  push(@Body() dto: PushSyncDto, @Req() request: Request & { user: RequestUser }) { return this.sync.push(request.user.id, dto); }
}

