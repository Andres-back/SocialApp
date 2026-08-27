import { Module } from '@nestjs/common';
import { SocialRecordsController } from './social-records.controller';
import { SocialRecordsService } from './social-records.service';
@Module({ controllers: [SocialRecordsController], providers: [SocialRecordsService], exports: [SocialRecordsService] })
export class SocialRecordsModule {}
