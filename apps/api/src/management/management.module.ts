import { Module } from '@nestjs/common';
import { AthletesModule } from '../athletes/athletes.module';
import { WorkModule } from '../work/work.module';
import { ManagementController } from './management.controller';
import { ManagementService } from './management.service';

@Module({ imports: [AthletesModule, WorkModule], controllers: [ManagementController], providers: [ManagementService] })
export class ManagementModule {}
