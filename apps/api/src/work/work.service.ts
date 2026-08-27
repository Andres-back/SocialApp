import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { matchesConfigurableRule, type AlertData, type AthleteWorkspace, type FollowUpCaseData, type FollowUpCaseInput, type FollowUpEntryData, type FollowUpEntryInput, type NetworkDiagramData, type ProfessionalObservationData, type SocioeconomicAssessmentData, type SocioeconomicAssessmentInput, type TimelineEvent } from '@socialapp/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async workspace(athleteId: string, userId: string): Promise<AthleteWorkspace> {
    const athlete = await this.prisma.athlete.findFirst({ where: { id: athleteId, deletedAt: null }, select: { id: true, createdAt: true } });
    if (!athlete) throw new NotFoundException('No encontramos este expediente.');
    const [assessment, alerts, followUps, observations, genogram, ecomap, socialRecords, screenings] = await Promise.all([
      this.prisma.socioeconomicAssessment.findFirst({ where: { athleteId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.alert.findMany({ where: { athleteId, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
      this.prisma.followUpCase.findMany({ where: { athleteId, deletedAt: null }, include: { entries: { where: { deletedAt: null }, orderBy: { date: 'desc' } } }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.professionalObservation.findMany({ where: { athleteId, deletedAt: null }, orderBy: { date: 'desc' } }),
      this.prisma.genogram.findFirst({ where: { athleteId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.ecomap.findFirst({ where: { athleteId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.socialRecord.findMany({ where: { athleteId, deletedAt: null }, select: { id: true, updatedAt: true, status: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.campaignParticipant.findMany({ where: { athleteId, deletedAt: null, status: 'COMPLETED' }, include: { campaign: true }, orderBy: { completedAt: 'desc' } }),
    ]);
    await this.audit.record({ actorUserId: userId, action: 'athlete.workspace.read', resourceType: 'Athlete', resourceId: athleteId });
    const timeline: TimelineEvent[] = [
      { id: athlete.id, date: athlete.createdAt.toISOString(), type: 'ATHLETE', title: 'Deportista registrado', tone: 'neutral' as const },
      ...socialRecords.map((item) => ({ id: item.id, date: item.updatedAt.toISOString(), type: 'SOCIAL_RECORD', title: item.status === 'COMPLETED' ? 'Ficha social realizada' : 'Ficha social actualizada', tone: 'success' as const })),
      ...(assessment ? [{ id: assessment.id, date: assessment.updatedAt.toISOString(), type: 'ASSESSMENT', title: 'Caracterización socioeconómica realizada', tone: 'success' as const }] : []),
      ...alerts.map((item) => ({ id: item.id, date: item.createdAt.toISOString(), type: 'ALERT', title: item.automaticIndicator, detail: item.status === 'DISMISSED' ? 'Indicador descartado' : 'Indicador para valoración', tone: item.level === 'RED' ? 'danger' as const : 'warning' as const })),
      ...followUps.flatMap((item) => [{ id: item.id, date: item.createdAt.toISOString(), type: 'FOLLOW_UP', title: `Seguimiento: ${item.motive}`, detail: item.status, tone: item.status === 'CLOSED' ? 'success' as const : 'neutral' as const }, ...item.entries.map((entry) => ({ id: entry.id, date: entry.date.toISOString(), type: 'FOLLOW_UP_ENTRY', title: 'Intervención registrada', detail: entry.actions, tone: 'neutral' as const }))]),
      ...observations.map((item) => ({ id: item.id, date: item.date.toISOString(), type: 'OBSERVATION', title: `Observación: ${item.type}`, detail: item.observation, tone: 'neutral' as const })),
      ...screenings.map((item) => ({ id: item.id, date: (item.completedAt ?? item.updatedAt).toISOString(), type: 'SCREENING', title: `Tamizaje completado: ${item.campaign.name}`, tone: 'success' as const })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    return {
      socioeconomicAssessment: assessment ? this.serializeAssessment(assessment) : null,
      alerts: alerts.map((item) => this.serializeAlert(item)),
      followUps: followUps.map((item) => this.serializeFollowUp(item)),
      observations: observations.map((item) => this.serializeObservation(item)),
      genogram: genogram ? this.serializeDiagram(genogram) : null,
      ecomap: ecomap ? this.serializeDiagram(ecomap) : null,
      timeline,
    };
  }

  async upsertAssessment(userId: string, input: SocioeconomicAssessmentInput, baseVersion: number) {
    this.require(input.id, input.athleteId, input.housingType, input.transportMode, input.incomeRange);
    const existing = await this.prisma.socioeconomicAssessment.findUnique({ where: { id: input.id } });
    if (existing && existing.version !== baseVersion) throw new ConflictException('Existe una versión más reciente de la caracterización.');
    const data = {
      athleteId: input.athleteId, instrumentVersion: input.instrumentVersion, status: input.status, housingType: input.housingType,
      housingTenure: input.housingTenure, bedrooms: input.bedrooms, householdSize: input.householdSize, zone: input.zone,
      utilities: input.utilities, exclusiveKitchen: input.exclusiveKitchen, transportMode: input.transportMode, travelTime: input.travelTime,
      transportDifficulty: input.transportDifficulty, foodReduction: input.foodReduction, foodBeforeTraining: input.foodBeforeTraining,
      incomeRange: input.incomeRange, dependents: input.dependents, informedObservation: input.informedObservation,
      professionalAssessment: input.professionalAssessment, completedAt: input.completedAt ? new Date(input.completedAt) : null,
    };
    const saved = existing
      ? await this.prisma.socioeconomicAssessment.update({ where: { id: input.id }, data: { ...data, version: { increment: 1 }, updatedBy: userId } })
      : await this.prisma.socioeconomicAssessment.create({ data: { id: input.id, ...data, createdBy: userId, updatedBy: userId } });
    await this.evaluateRules(userId, 'SOCIOECONOMIC', saved.id, input.athleteId, input as unknown as Record<string, unknown>);
    await this.audit.record({ actorUserId: userId, action: existing ? 'assessment.update' : 'assessment.create', resourceType: 'SocioeconomicAssessment', resourceId: saved.id });
    return this.serializeAssessment(saved);
  }

  async upsertAlert(userId: string, input: AlertData, baseVersion: number) {
    this.require(input.id, input.athleteId, input.sourceType, input.automaticIndicator);
    const existing = await this.prisma.alert.findUnique({ where: { id: input.id } });
    if (existing && existing.version !== baseVersion) throw new ConflictException('Existe una versión más reciente de la alerta.');
    const data = { athleteId: input.athleteId, sourceType: input.sourceType, sourceId: input.sourceId, level: input.level, status: input.status, informedData: input.informedData, automaticIndicator: input.automaticIndicator, professionalAssessment: input.professionalAssessment };
    const saved = existing ? await this.prisma.alert.update({ where: { id: input.id }, data: { ...data, version: { increment: 1 }, updatedBy: userId } }) : await this.prisma.alert.create({ data: { id: input.id, ...data, createdBy: userId, updatedBy: userId } });
    await this.audit.record({ actorUserId: userId, action: existing ? 'alert.update' : 'alert.create', resourceType: 'Alert', resourceId: saved.id });
    return this.serializeAlert(saved);
  }

  async updateAlert(userId: string, id: string, input: Partial<AlertData> & { version: number }) {
    const existing = await this.prisma.alert.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('No encontramos la alerta.');
    if (existing.version !== input.version) throw new ConflictException('Existe una versión más reciente de la alerta.');
    const saved = await this.prisma.alert.update({ where: { id }, data: { level: input.level, status: input.status, professionalAssessment: input.professionalAssessment, version: { increment: 1 }, updatedBy: userId } });
    await this.audit.record({ actorUserId: userId, action: 'alert.review', resourceType: 'Alert', resourceId: id });
    return this.serializeAlert(saved);
  }

  async upsertFollowUp(userId: string, input: FollowUpCaseInput, baseVersion: number) {
    this.require(input.id, input.athleteId, input.motive, input.responsible);
    const existing = await this.prisma.followUpCase.findUnique({ where: { id: input.id } });
    if (existing && existing.version !== baseVersion) throw new ConflictException('Existe una versión más reciente del seguimiento.');
    const data = { athleteId: input.athleteId, motive: input.motive, priority: input.priority, status: input.status, responsible: input.responsible, nextAction: input.nextAction, estimatedDate: input.estimatedDate ? new Date(input.estimatedDate) : null };
    const saved = existing ? await this.prisma.followUpCase.update({ where: { id: input.id }, data: { ...data, version: { increment: 1 }, updatedBy: userId }, include: { entries: true } }) : await this.prisma.followUpCase.create({ data: { id: input.id, ...data, createdBy: userId, updatedBy: userId }, include: { entries: true } });
    await this.audit.record({ actorUserId: userId, action: existing ? 'follow-up.update' : 'follow-up.create', resourceType: 'FollowUpCase', resourceId: saved.id });
    return this.serializeFollowUp(saved);
  }

  async updateFollowUp(userId: string, id: string, input: Partial<FollowUpCaseInput> & { version: number }) {
    const existing = await this.prisma.followUpCase.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('No encontramos el seguimiento.');
    if (existing.version !== input.version) throw new ConflictException('Existe una versión más reciente del seguimiento.');
    const saved = await this.prisma.followUpCase.update({ where: { id }, data: { motive: input.motive, priority: input.priority, status: input.status, responsible: input.responsible, nextAction: input.nextAction, estimatedDate: input.estimatedDate ? new Date(input.estimatedDate) : input.estimatedDate === null ? null : undefined, version: { increment: 1 }, updatedBy: userId }, include: { entries: { where: { deletedAt: null }, orderBy: { date: 'desc' } } } });
    await this.audit.record({ actorUserId: userId, action: 'follow-up.status-change', resourceType: 'FollowUpCase', resourceId: id, metadata: { status: saved.status } });
    return this.serializeFollowUp(saved);
  }

  async addFollowUpEntry(userId: string, input: FollowUpEntryInput) {
    this.require(input.id, input.followUpCaseId, input.date, input.situation, input.actions, input.responsible);
    const entry = await this.prisma.followUpEntry.upsert({ where: { id: input.id }, update: { situation: input.situation, actions: input.actions, agreements: input.agreements, responsible: input.responsible, nextAction: input.nextAction, estimatedDate: input.estimatedDate ? new Date(input.estimatedDate) : null, updatedBy: userId, version: { increment: 1 } }, create: { id: input.id, followUpCaseId: input.followUpCaseId, date: new Date(input.date), situation: input.situation, actions: input.actions, agreements: input.agreements, responsible: input.responsible, nextAction: input.nextAction, estimatedDate: input.estimatedDate ? new Date(input.estimatedDate) : null, createdBy: userId, updatedBy: userId } });
    await this.prisma.followUpCase.update({ where: { id: input.followUpCaseId }, data: { status: 'IN_PROGRESS', nextAction: input.nextAction, estimatedDate: input.estimatedDate ? new Date(input.estimatedDate) : undefined, updatedBy: userId, version: { increment: 1 } } });
    await this.audit.record({ actorUserId: userId, action: 'follow-up.entry.create', resourceType: 'FollowUpEntry', resourceId: entry.id });
    return this.serializeEntry(entry);
  }

  async upsertObservation(userId: string, input: ProfessionalObservationData) {
    this.require(input.id, input.athleteId, input.date, input.type, input.observation);
    const saved = await this.prisma.professionalObservation.upsert({ where: { id: input.id }, update: { date: new Date(input.date), type: input.type, observation: input.observation, visibility: input.visibility, updatedBy: userId, version: { increment: 1 } }, create: { id: input.id, athleteId: input.athleteId, date: new Date(input.date), type: input.type, observation: input.observation, visibility: input.visibility, createdBy: userId, updatedBy: userId } });
    await this.audit.record({ actorUserId: userId, action: 'observation.save', resourceType: 'ProfessionalObservation', resourceId: saved.id });
    return this.serializeObservation(saved);
  }

  async upsertDiagram(userId: string, type: 'genogram' | 'ecomap', input: NetworkDiagramData, baseVersion: number) {
    this.require(input.id, input.athleteId);
    const delegate = type === 'genogram' ? this.prisma.genogram : this.prisma.ecomap;
    const existing = await (delegate as any).findUnique({ where: { id: input.id } });
    if (existing && existing.version !== baseVersion) throw new ConflictException('Existe una versión más reciente del diagrama.');
    const saved = await (delegate as any).upsert({ where: { id: input.id }, update: { nodes: input.nodes as unknown as Prisma.InputJsonValue, edges: input.edges as unknown as Prisma.InputJsonValue, updatedBy: userId, version: { increment: 1 } }, create: { id: input.id, athleteId: input.athleteId, nodes: input.nodes as unknown as Prisma.InputJsonValue, edges: input.edges as unknown as Prisma.InputJsonValue, createdBy: userId, updatedBy: userId } });
    await this.audit.record({ actorUserId: userId, action: `${type}.save`, resourceType: type === 'genogram' ? 'Genogram' : 'Ecomap', resourceId: saved.id });
    return this.serializeDiagram(saved);
  }

  async applySync(userId: string, entityType: string, payload: unknown, baseVersion: number): Promise<number> {
    if (entityType === 'socioeconomic-assessment') return (await this.upsertAssessment(userId, payload as SocioeconomicAssessmentInput, baseVersion)).version;
    if (entityType === 'alert') return (await this.upsertAlert(userId, payload as AlertData, baseVersion)).version;
    if (entityType === 'follow-up') return (await this.upsertFollowUp(userId, payload as FollowUpCaseInput, baseVersion)).version;
    if (entityType === 'follow-up-entry') { await this.addFollowUpEntry(userId, payload as FollowUpEntryInput); return 1; }
    if (entityType === 'observation') { await this.upsertObservation(userId, payload as ProfessionalObservationData); return 1; }
    if (entityType === 'genogram' || entityType === 'ecomap') return (await this.upsertDiagram(userId, entityType, payload as NetworkDiagramData, baseVersion)).version;
    throw new BadRequestException(`La entidad “${entityType}” no está habilitada para Trabajo Social.`);
  }

  private async evaluateRules(userId: string, source: string, sourceId: string, athleteId: string, values: Record<string, unknown>) {
    const rules = await this.prisma.configurableRule.findMany({ where: { source, active: true, deletedAt: null } });
    await this.prisma.alert.updateMany({ where: { sourceType: source, sourceId, status: 'PENDING' }, data: { deletedAt: new Date(), updatedBy: userId } });
    for (const rule of rules) {
      const actual = values[rule.field];
      const matched = matchesConfigurableRule({ field: rule.field, operator: rule.operator as 'EQUALS' | 'INCLUDES' | 'GREATER_THAN', expectedValue: rule.expectedValue }, values);
      if (matched) await this.prisma.alert.create({ data: { athleteId, sourceType: source, sourceId, level: rule.level, automaticIndicator: rule.indicator, informedData: `${rule.field}: ${String(actual)}`, createdBy: userId, updatedBy: userId } });
    }
  }

  private require(...values: unknown[]) {
    if (values.some((value) => value === undefined || value === null || value === '')) throw new BadRequestException('Completa los campos obligatorios.');
  }
  private serializeAssessment(item: any): SocioeconomicAssessmentData { return { ...item, completedAt: item.completedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
  private serializeAlert(item: any): AlertData { return { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
  private serializeEntry(item: any): FollowUpEntryData { return { id: item.id, followUpCaseId: item.followUpCaseId, date: item.date.toISOString().slice(0, 10), situation: item.situation, actions: item.actions, agreements: item.agreements, responsible: item.responsible, nextAction: item.nextAction, estimatedDate: item.estimatedDate?.toISOString().slice(0, 10) ?? null, professionalName: item.responsible, createdAt: item.createdAt.toISOString() }; }
  private serializeFollowUp(item: any): FollowUpCaseData { return { id: item.id, athleteId: item.athleteId, motive: item.motive, priority: item.priority, status: item.status, responsible: item.responsible, nextAction: item.nextAction, estimatedDate: item.estimatedDate?.toISOString().slice(0, 10) ?? null, version: item.version, professionalName: item.responsible, entries: item.entries.map((entry: any) => this.serializeEntry(entry)), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
  private serializeObservation(item: any): ProfessionalObservationData { return { id: item.id, athleteId: item.athleteId, date: item.date.toISOString().slice(0, 10), type: item.type, observation: item.observation, visibility: item.visibility, professionalName: 'Trabajo Social', createdAt: item.createdAt.toISOString() }; }
  private serializeDiagram(item: any): NetworkDiagramData { return { id: item.id, athleteId: item.athleteId, nodes: item.nodes, edges: item.edges, version: item.version, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
}
