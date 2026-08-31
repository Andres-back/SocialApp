import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { matchesConfigurableRule, validateScreeningResponses, type CampaignParticipantData, type ScreeningCampaignData, type ScreeningCampaignInput, type ScreeningInstrumentData, type ScreeningQuestionData } from '@socialapp/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ScreeningResultInput {
  id: string;
  campaignId: string;
  athleteId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  responses: Record<string, unknown>;
  completedAt?: string | null;
  version: number;
}

const campaignInclude = {
  sportsProgram: true,
  sport: true,
  instrument: { include: { questions: { where: { deletedAt: null }, orderBy: { position: 'asc' as const } } } },
  participants: { where: { deletedAt: null }, include: { athlete: true }, orderBy: { athlete: { lastNames: 'asc' as const } } },
};

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async instruments(): Promise<ScreeningInstrumentData[]> {
    const rows = await this.prisma.screeningInstrument.findMany({ where: { active: true, deletedAt: null }, include: { questions: { where: { deletedAt: null }, orderBy: { position: 'asc' } } }, orderBy: { name: 'asc' } });
    return rows.map((item) => this.serializeInstrument(item));
  }
  async list(): Promise<ScreeningCampaignData[]> {
    const rows = await this.prisma.screeningCampaign.findMany({ where: { deletedAt: null }, include: campaignInclude, orderBy: { date: 'desc' } });
    return rows.map((item) => this.serializeCampaign(item));
  }
  async detail(id: string): Promise<ScreeningCampaignData> {
    const item = await this.prisma.screeningCampaign.findFirst({ where: { id, deletedAt: null }, include: campaignInclude });
    if (!item) throw new NotFoundException('No encontramos la brigada.');
    return this.serializeCampaign(item);
  }
  async upsert(userId: string, input: ScreeningCampaignInput, baseVersion: number): Promise<ScreeningCampaignData> {
    if (!input.id || !input.name || !input.date || !input.place || !input.instrumentId) throw new BadRequestException('Completa los datos obligatorios de la brigada.');
    if (new Set(input.athleteIds).size !== input.athleteIds.length) throw new BadRequestException('La población asignada contiene deportistas duplicados.');
    const existing = await this.prisma.screeningCampaign.findUnique({ where: { id: input.id } });
    if (existing && existing.version !== baseVersion) throw new ConflictException('Existe una versión más reciente de la brigada.');
    const assignedAthletes = await this.prisma.athlete.count({ where: { id: { in: input.athleteIds }, status: 'ACTIVE', deletedAt: null } });
    if (assignedAthletes !== input.athleteIds.length) throw new BadRequestException('Uno o más deportistas no están activos o ya no están disponibles.');
    if (existing) {
      const participants = await this.prisma.campaignParticipant.findMany({ where: { campaignId: input.id, deletedAt: null } });
      const protectedParticipants = participants.filter((participant) => participant.status !== 'PENDING');
      if (existing.instrumentId !== input.instrumentId && protectedParticipants.length > 0) throw new BadRequestException('No puedes cambiar el instrumento después de iniciar tamizajes.');
      const removedStarted = protectedParticipants.some((participant) => !input.athleteIds.includes(participant.athleteId));
      if (removedStarted) throw new BadRequestException('No puedes retirar deportistas con tamizajes iniciados o completados.');
    }
    const data = { name: input.name, date: new Date(input.date), place: input.place, sportsProgramId: input.sportsProgramId || null, sportId: input.sportId || null, instrumentId: input.instrumentId, professionalName: input.professionalName, status: input.status };
    const saved = await this.prisma.$transaction(async (tx) => {
      const campaign = existing
        ? await tx.screeningCampaign.update({ where: { id: input.id }, data: { ...data, updatedBy: userId, version: { increment: 1 } } })
        : await tx.screeningCampaign.create({ data: { id: input.id, ...data, createdBy: userId, updatedBy: userId } });
      for (const athleteId of input.athleteIds) {
        await tx.campaignParticipant.upsert({ where: { campaignId_athleteId: { campaignId: campaign.id, athleteId } }, update: { deletedAt: null, updatedBy: userId }, create: { campaignId: campaign.id, athleteId, createdBy: userId, updatedBy: userId } });
      }
      await tx.campaignParticipant.updateMany({ where: { campaignId: campaign.id, athleteId: { notIn: input.athleteIds }, status: 'PENDING' }, data: { deletedAt: new Date(), updatedBy: userId } });
      if (input.status === 'COMPLETED') {
        const incomplete = await tx.campaignParticipant.count({ where: { campaignId: campaign.id, deletedAt: null, status: { not: 'COMPLETED' } } });
        if (incomplete > 0) throw new BadRequestException('Completa todos los tamizajes antes de cerrar la brigada.');
      }
      return tx.screeningCampaign.findUniqueOrThrow({ where: { id: campaign.id }, include: campaignInclude });
    });
    await this.audit.record({ actorUserId: userId, action: existing ? 'campaign.update' : 'campaign.create', resourceType: 'ScreeningCampaign', resourceId: saved.id });
    return this.serializeCampaign(saved);
  }
  async remove(userId: string, id: string) {
    const campaign = await this.prisma.screeningCampaign.findUnique({ where: { id } });
    if (!campaign || campaign.deletedAt) return { success: true, alreadyDeleted: true };
    await this.prisma.screeningCampaign.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: userId, version: { increment: 1 } } });
    await this.audit.record({ actorUserId: userId, action: 'campaign.delete', resourceType: 'ScreeningCampaign', resourceId: id, metadata: { mode: 'soft-delete' } });
    return { success: true };
  }
  async saveResult(userId: string, input: ScreeningResultInput): Promise<CampaignParticipantData> {
    if (!input.campaignId || !input.athleteId || !input.id) throw new BadRequestException('No fue posible identificar el tamizaje.');
    const existing = await this.prisma.campaignParticipant.findUnique({
      where: { campaignId_athleteId: { campaignId: input.campaignId, athleteId: input.athleteId } },
      include: { athlete: true, campaign: { include: { instrument: { include: { questions: { where: { deletedAt: null }, orderBy: { position: 'asc' } } } } } } },
    });
    if (!existing) throw new NotFoundException('El deportista no está asignado a esta brigada.');
    if (existing.campaign.status !== 'ACTIVE') throw new BadRequestException(existing.campaign.status === 'COMPLETED' ? 'Reabre la brigada antes de modificar un resultado.' : 'Inicia la jornada antes de aplicar el instrumento.');
    if (existing.version !== input.version) throw new ConflictException('Existe una versión más reciente del tamizaje.');
    const questions = existing.campaign.instrument.questions.map((question) => ({
      id: question.id, dimension: question.dimension, prompt: question.prompt, type: question.type, options: question.options as string[], required: question.required, position: question.position,
    })) as ScreeningQuestionData[];
    const validationErrors = validateScreeningResponses(questions, input.responses, input.status === 'COMPLETED');
    if (validationErrors.length > 0) throw new BadRequestException(validationErrors);
    const saved = await this.prisma.campaignParticipant.update({ where: { id: existing.id }, data: { status: input.status, responses: input.responses as Prisma.InputJsonValue, completedAt: input.completedAt ? new Date(input.completedAt) : input.status === 'COMPLETED' ? new Date() : null, updatedBy: userId, version: { increment: 1 } }, include: { athlete: true } });
    if (input.status === 'COMPLETED') await this.evaluateRules(userId, saved.id, saved.athleteId, input.responses);
    await this.audit.record({ actorUserId: userId, action: 'screening.save', resourceType: 'CampaignParticipant', resourceId: saved.id });
    return this.serializeParticipant(saved);
  }
  async applySync(userId: string, entityType: string, payload: unknown, baseVersion: number): Promise<number> {
    if (entityType === 'campaign') return (await this.upsert(userId, payload as ScreeningCampaignInput, baseVersion)).version;
    if (entityType === 'screening-result') return (await this.saveResult(userId, payload as ScreeningResultInput)).version;
    throw new BadRequestException('La entidad no está habilitada para brigadas.');
  }
  private async evaluateRules(userId: string, sourceId: string, athleteId: string, responses: Record<string, unknown>) {
    const rules = await this.prisma.configurableRule.findMany({ where: { source: 'SCREENING', active: true, deletedAt: null } });
    await this.prisma.alert.updateMany({ where: { sourceType: 'SCREENING', sourceId, status: 'PENDING' }, data: { deletedAt: new Date(), updatedBy: userId } });
    for (const rule of rules) {
      const actual = responses[rule.field];
      const matched = matchesConfigurableRule({ field: rule.field, operator: rule.operator as 'EQUALS' | 'INCLUDES' | 'GREATER_THAN', expectedValue: rule.expectedValue }, responses);
      if (matched) await this.prisma.alert.create({ data: { athleteId, sourceType: 'SCREENING', sourceId, level: rule.level, automaticIndicator: rule.indicator, informedData: `Respuesta informada: ${String(actual)}`, createdBy: userId, updatedBy: userId } });
    }
  }
  private serializeInstrument(item: any): ScreeningInstrumentData {
    return { id: item.id, name: item.name, version: item.version, ageGroup: item.ageGroup, active: item.active, questions: item.questions.map((question: any) => ({ id: question.id, dimension: question.dimension, prompt: question.prompt, type: question.type, options: question.options, required: question.required, position: question.position })) };
  }
  private serializeParticipant(item: any): CampaignParticipantData {
    return { id: item.id, athleteId: item.athleteId, athleteName: `${item.athlete.firstNames} ${item.athlete.lastNames}`, status: item.status, responses: item.responses as Record<string, unknown>, completedAt: item.completedAt?.toISOString() ?? null, version: item.version };
  }
  private serializeCampaign(item: any): ScreeningCampaignData {
    return { id: item.id, name: item.name, date: item.date.toISOString().slice(0, 10), place: item.place, sportsProgramId: item.sportsProgramId, sportId: item.sportId, instrumentId: item.instrumentId, professionalName: item.professionalName, athleteIds: item.participants.map((participant: any) => participant.athleteId), status: item.status, version: item.version, sportsProgramName: item.sportsProgram?.name ?? null, sportName: item.sport?.name ?? null, instrument: this.serializeInstrument(item.instrument), participants: item.participants.map((participant: any) => this.serializeParticipant(participant)), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }
}
