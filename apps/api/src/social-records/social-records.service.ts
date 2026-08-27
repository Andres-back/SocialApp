import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { SocialRecordData } from '@socialapp/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertSocialRecordDto } from './dto/upsert-social-record.dto';

@Injectable()
export class SocialRecordsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async latest(athleteId: string, actorUserId?: string): Promise<SocialRecordData | null> {
    const record = await this.prisma.socialRecord.findFirst({
      where: { athleteId, deletedAt: null },
      include: { householdMembers: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (record && actorUserId) await this.audit.record({ actorUserId, action: 'social-record.read', resourceType: 'SocialRecord', resourceId: record.id });
    return record ? this.serialize(record) : null;
  }

  async upsert(userId: string, dto: UpsertSocialRecordDto, baseVersion: number): Promise<SocialRecordData> {
    const athlete = await this.prisma.athlete.findFirst({ where: { id: dto.athleteId, deletedAt: null }, select: { id: true } });
    if (!athlete) throw new NotFoundException('No encontramos el deportista de esta ficha.');
    const existing = await this.prisma.socialRecord.findUnique({ where: { id: dto.id } });
    if (existing && baseVersion !== existing.version) {
      throw new ConflictException({ message: 'Existe una versión más reciente de la ficha social.', serverVersion: existing.version });
    }
    const common = {
      athleteId: dto.athleteId,
      instrumentVersion: dto.instrumentVersion,
      status: dto.status,
      livingWith: dto.livingWith,
      primaryCaregiver: dto.primaryCaregiver,
      otherCaregiver: dto.otherCaregiver?.trim() || null,
      familyRelationships: dto.familyRelationships,
      supportNetworks: dto.supportNetworks,
      otherSupportNetwork: dto.otherSupportNetwork?.trim() || null,
      professionalObservation: dto.professionalObservation?.trim() || null,
      completedAt: dto.status === 'COMPLETED' ? new Date(dto.completedAt ?? Date.now()) : null,
      updatedBy: userId,
    };
    const members = dto.householdMembers.map((member) => ({
      id: member.id,
      name: member.name.trim(),
      relationship: member.relationship.trim(),
      approximateAge: member.approximateAge ?? null,
      livesWithAthlete: member.livesWithAthlete,
      occupation: member.occupation?.trim() || null,
      relationshipQuality: member.relationshipQuality,
      createdBy: userId,
      updatedBy: userId,
    }));
    const record = existing
      ? await this.prisma.$transaction(async (tx) => {
          await tx.householdMember.deleteMany({ where: { socialRecordId: dto.id } });
          return tx.socialRecord.update({
            where: { id: dto.id },
            data: { ...common, version: { increment: 1 }, householdMembers: { create: members } },
            include: { householdMembers: { orderBy: { createdAt: 'asc' } } },
          });
        })
      : await this.prisma.socialRecord.create({
          data: { id: dto.id, ...common, createdBy: userId, version: 1, householdMembers: { create: members } },
          include: { householdMembers: { orderBy: { createdAt: 'asc' } } },
        });
    await this.audit.record({ actorUserId: userId, action: existing ? 'social-record.update' : 'social-record.create', resourceType: 'SocialRecord', resourceId: record.id, metadata: { status: record.status, athleteId: record.athleteId } });
    return this.serialize(record);
  }

  private serialize(record: any): SocialRecordData {
    return {
      id: record.id,
      athleteId: record.athleteId,
      instrumentVersion: record.instrumentVersion,
      status: record.status,
      livingWith: record.livingWith,
      householdMembers: record.householdMembers.map((member: any) => ({
        id: member.id,
        name: member.name,
        relationship: member.relationship,
        approximateAge: member.approximateAge,
        livesWithAthlete: member.livesWithAthlete,
        occupation: member.occupation,
        relationshipQuality: member.relationshipQuality,
      })),
      primaryCaregiver: record.primaryCaregiver,
      otherCaregiver: record.otherCaregiver,
      familyRelationships: record.familyRelationships,
      supportNetworks: record.supportNetworks,
      otherSupportNetwork: record.otherSupportNetwork,
      professionalObservation: record.professionalObservation,
      completedAt: record.completedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      version: record.version,
    };
  }
}
