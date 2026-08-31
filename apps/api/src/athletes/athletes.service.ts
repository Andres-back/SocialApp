import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AthleteRecord } from '@socialapp/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertAthleteDto } from './dto/upsert-athlete.dto';

const athleteInclude = {
  sportsProgram: true,
  sport: true,
  category: true,
  coach: true,
  guardian: true,
  socialRecords: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' as const }, take: 1 },
} as const;

@Injectable()
export class AthletesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(search?: string, coachName?: string): Promise<AthleteRecord[]> {
    const term = search?.trim();
    const athletes = await this.prisma.athlete.findMany({
      where: {
        deletedAt: null,
        ...(coachName ? { coach: { name: coachName } } : {}),
        ...(term ? { OR: [
          { firstNames: { contains: term, mode: 'insensitive' } },
          { lastNames: { contains: term, mode: 'insensitive' } },
          { internalCode: { contains: term, mode: 'insensitive' } },
          { documentNumber: { contains: term, mode: 'insensitive' } },
        ] } : {}),
      },
      include: athleteInclude,
      orderBy: [{ lastNames: 'asc' }, { firstNames: 'asc' }],
    });
    return athletes.map((athlete) => this.serialize(athlete, !coachName));
  }

  async get(id: string, actorUserId?: string, coachName?: string): Promise<AthleteRecord> {
    const athlete = await this.prisma.athlete.findFirst({
      where: { id, deletedAt: null, ...(coachName ? { coach: { name: coachName } } : {}) },
      include: athleteInclude,
    });
    if (!athlete) throw new NotFoundException('No encontramos este deportista.');
    if (actorUserId) await this.audit.record({ actorUserId, action: 'athlete.read', resourceType: 'Athlete', resourceId: id });
    return this.serialize(athlete, !coachName);
  }

  async upsert(userId: string, dto: UpsertAthleteDto, baseVersion: number): Promise<AthleteRecord> {
    const existing = await this.prisma.athlete.findUnique({ where: { id: dto.id } });
    if (existing && baseVersion !== existing.version) {
      throw new ConflictException({ message: 'Existe una versión más reciente del deportista.', serverVersion: existing.version });
    }
    const common = {
      internalCode: dto.internalCode.trim().toUpperCase(),
      documentType: dto.documentType,
      documentNumber: dto.documentNumber?.trim() || null,
      firstNames: dto.firstNames.trim(),
      lastNames: dto.lastNames.trim(),
      birthDate: new Date(dto.birthDate),
      sex: dto.sex,
      municipality: dto.municipality.trim(),
      zone: dto.zone,
      sportsProgramId: dto.sportsProgramId,
      sportId: dto.sportId,
      categoryId: dto.categoryId,
      coachId: dto.coachId || null,
      joinedAt: new Date(dto.joinedAt),
      status: dto.status,
      schoolName: dto.schoolName?.trim() || null,
      schoolGrade: dto.schoolGrade?.trim() || null,
      schoolShift: dto.schoolShift?.trim() || null,
      currentlyEnrolled: dto.currentlyEnrolled,
      updatedBy: userId,
    };
    const guardian = dto.guardian ? {
      name: dto.guardian.name?.trim() || 'Por definir',
      relationship: dto.guardian.relationship?.trim() || 'Por definir',
      phone: dto.guardian.phone?.trim() || 'Por definir',
      email: dto.guardian.email?.trim() || null,
    } : null;
    const athlete = existing
      ? await this.prisma.$transaction(async (transaction) => {
          const claimed = await transaction.athlete.updateMany({
            where: { id: dto.id, version: baseVersion, deletedAt: null },
            data: { ...common, version: { increment: 1 } },
          });
          if (claimed.count !== 1) {
            const current = await transaction.athlete.findUnique({ where: { id: dto.id }, select: { version: true } });
            throw new ConflictException({ message: 'Existe una versión más reciente del deportista.', serverVersion: current?.version });
          }
          if (guardian) {
            await transaction.guardian.upsert({
              where: { athleteId: dto.id },
              create: { athleteId: dto.id, ...guardian, createdBy: userId, updatedBy: userId },
              update: { ...guardian, updatedBy: userId, version: { increment: 1 } },
            });
          }
          const updated = await transaction.athlete.findUnique({ where: { id: dto.id }, include: athleteInclude });
          if (!updated) throw new NotFoundException('No encontramos este deportista.');
          return updated;
        })
      : await this.prisma.athlete.create({
          data: {
            id: dto.id,
            ...common,
            createdBy: userId,
            version: 1,
            ...(guardian ? { guardian: { create: { ...guardian, createdBy: userId, updatedBy: userId } } } : {}),
          },
          include: athleteInclude,
        });
    await this.audit.record({ actorUserId: userId, action: existing ? 'athlete.update' : 'athlete.create', resourceType: 'Athlete', resourceId: athlete.id });
    return this.serialize(athlete);
  }

  async remove(userId: string, id: string) {
    const athlete = await this.prisma.athlete.findFirst({ where: { id, deletedAt: null } });
    if (!athlete) throw new NotFoundException('No encontramos este deportista.');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.athlete.update({ where: { id }, data: { deletedAt: now, status: 'RETIRED', updatedBy: userId, version: { increment: 1 } } }),
      this.prisma.campaignParticipant.updateMany({
        where: { athleteId: id, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        data: { deletedAt: now, updatedBy: userId },
      }),
    ]);
    await this.audit.record({ actorUserId: userId, action: 'athlete.delete', resourceType: 'Athlete', resourceId: id, metadata: { mode: 'soft-delete' } });
    return { success: true };
  }

  private serialize(athlete: any, includeSocialRecord = true): AthleteRecord {
    const today = new Date();
    const birth = new Date(athlete.birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
    const record = includeSocialRecord ? athlete.socialRecords[0] : undefined;
    return {
      id: athlete.id,
      internalCode: athlete.internalCode,
      documentType: athlete.documentType,
      documentNumber: athlete.documentNumber,
      firstNames: athlete.firstNames,
      lastNames: athlete.lastNames,
      birthDate: birth.toISOString().slice(0, 10),
      age,
      sex: athlete.sex,
      municipality: athlete.municipality,
      zone: athlete.zone,
      sportsProgramId: athlete.sportsProgramId,
      sportsProgramName: athlete.sportsProgram.name,
      sportId: athlete.sportId,
      sportName: athlete.sport.name,
      categoryId: athlete.categoryId,
      categoryName: athlete.category.name,
      coachId: athlete.coachId,
      coachName: athlete.coach?.name ?? null,
      joinedAt: new Date(athlete.joinedAt).toISOString().slice(0, 10),
      status: athlete.status,
      schoolName: athlete.schoolName,
      schoolGrade: athlete.schoolGrade,
      schoolShift: athlete.schoolShift,
      currentlyEnrolled: athlete.currentlyEnrolled,
      guardian: athlete.guardian ? {
        name: athlete.guardian.name,
        relationship: athlete.guardian.relationship,
        phone: athlete.guardian.phone,
        email: athlete.guardian.email,
      } : { name: '', relationship: '', phone: '', email: null },
      hasSocialRecord: Boolean(record),
      socialRecordUpdatedAt: record?.updatedAt?.toISOString() ?? null,
      createdAt: athlete.createdAt.toISOString(),
      updatedAt: athlete.updatedAt.toISOString(),
      version: athlete.version,
    };
  }
}
