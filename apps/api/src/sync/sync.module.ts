import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { AthletesModule } from '../athletes/athletes.module';
import { SocialRecordsModule } from '../social-records/social-records.module';
import { WorkModule } from '../work/work.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
@Module({ imports: [AthletesModule, SocialRecordsModule, WorkModule, CampaignsModule], controllers: [SyncController], providers: [SyncService] })
export class SyncModule {}
