import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import type { SyncPushResponse } from '@socialapp/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { PushSyncDto } from './dto/push-sync.dto';
import { AthletesService } from '../athletes/athletes.service';
import { SocialRecordsService } from '../social-records/social-records.service';
import { UpsertAthleteDto } from '../athletes/dto/upsert-athlete.dto';
import { UpsertSocialRecordDto } from '../social-records/dto/upsert-social-record.dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { WorkService } from '../work/work.service';
import { CampaignsService } from '../campaigns/campaigns.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly athletes: AthletesService,
    private readonly socialRecords: SocialRecordsService,
    private readonly work: WorkService,
    private readonly campaigns: CampaignsService,
  ) {}
  async push(userId: string, dto: PushSyncDto): Promise<SyncPushResponse> {
    const results = [];
    for (const mutation of dto.mutations) {
      const previous = await this.prisma.syncMutationReceipt.findUnique({ where: { mutationId: mutation.mutationId } });
      if (previous) {
        results.push({ mutationId: mutation.mutationId, status: previous.status === 'ACCEPTED' ? 'accepted' as const : previous.status === 'CONFLICT' ? 'conflict' as const : 'rejected' as const, serverVersion: previous.serverVersion ?? undefined, message: previous.message ?? undefined });
        continue;
      }
      try {
        let serverVersion: number;
        if (mutation.entityType === 'athlete') {
          const dto = plainToInstance(UpsertAthleteDto, mutation.payload);
          await validateOrReject(dto, { whitelist: true, forbidNonWhitelisted: true });
          const result = await this.athletes.upsert(userId, dto, mutation.baseVersion);
          serverVersion = result.version;
        } else if (mutation.entityType === 'social-record') {
          const dto = plainToInstance(UpsertSocialRecordDto, mutation.payload);
          await validateOrReject(dto, { whitelist: true, forbidNonWhitelisted: true });
          const result = await this.socialRecords.upsert(userId, dto, mutation.baseVersion);
          serverVersion = result.version;
        } else if (['socioeconomic-assessment', 'alert', 'follow-up', 'follow-up-entry', 'observation', 'genogram', 'ecomap'].includes(mutation.entityType)) {
          serverVersion = await this.work.applySync(userId, mutation.entityType, mutation.payload, mutation.baseVersion);
        } else if (['campaign', 'screening-result'].includes(mutation.entityType)) {
          serverVersion = await this.campaigns.applySync(userId, mutation.entityType, mutation.payload, mutation.baseVersion);
        } else {
          throw new Error(`La entidad “${mutation.entityType}” no está habilitada para sincronización.`);
        }
        await this.prisma.syncMutationReceipt.create({ data: { mutationId: mutation.mutationId, userId, entityType: mutation.entityType, entityId: mutation.entityId, operation: mutation.operation, status: 'ACCEPTED', serverVersion } });
        results.push({ mutationId: mutation.mutationId, status: 'accepted' as const, serverVersion });
      } catch (error) {
        const conflict = error instanceof ConflictException;
        const response = error instanceof HttpException ? error.getResponse() : null;
        const detail = response && typeof response === 'object' ? response as { message?: string | string[]; serverVersion?: number } : null;
        const message = Array.isArray(detail?.message)
          ? detail.message.join(' ')
          : detail?.message || (typeof response === 'string' ? response : error instanceof Error ? error.message : 'No fue posible procesar el registro.');
        const serverVersion = detail?.serverVersion;
        await this.prisma.syncMutationReceipt.create({ data: { mutationId: mutation.mutationId, userId, entityType: mutation.entityType, entityId: mutation.entityId, operation: mutation.operation, status: conflict ? 'CONFLICT' : 'REJECTED', message, serverVersion } });
        results.push({ mutationId: mutation.mutationId, status: conflict ? 'conflict' as const : 'rejected' as const, message, serverVersion });
      }
    }
    return { results, serverTime: new Date().toISOString() };
  }
}
