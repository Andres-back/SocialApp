import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './iam/jwt-auth.guard';
import { PermissionsGuard } from './iam/permissions.guard';
import { PrismaModule } from './prisma/prisma.module';
import { SyncModule } from './sync/sync.module';
import { AthletesModule } from './athletes/athletes.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { SocialRecordsModule } from './social-records/social-records.module';
import { WorkModule } from './work/work.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ManagementModule } from './management/management.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    HealthModule,
    SyncModule,
    CatalogsModule,
    AthletesModule,
    SocialRecordsModule,
    WorkModule,
    CampaignsModule,
    ManagementModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
