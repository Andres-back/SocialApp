import { Controller, Get } from '@nestjs/common';
import { PERMISSIONS } from '@socialapp/shared';
import { RequirePermissions } from '../iam/permissions.decorator';
import { CatalogsService } from './catalogs.service';
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}
  @Get('sports') @RequirePermissions(PERMISSIONS.ATHLETE_READ)
  sports() { return this.catalogs.sports(); }
}
