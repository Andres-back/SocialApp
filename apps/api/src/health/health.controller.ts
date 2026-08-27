import { Controller, Get } from '@nestjs/common';
import { Public } from '../iam/public.decorator';
@Public()
@Controller('health')
export class HealthController {
  @Get() getHealth() { return { status: 'ok', service: 'socialapp-api', time: new Date().toISOString() }; }
}

