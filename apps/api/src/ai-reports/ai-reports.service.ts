import { BadGatewayException, BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AiRiskLevel, AiRiskReportData } from '@socialapp/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

type GeneratedRiskReport = Omit<AiRiskReportData, 'id' | 'athleteId' | 'sourceParticipantId' | 'status' | 'model' | 'generatedAt' | 'reviewedAt' | 'version'>;

const reportSchema = {
  type: 'object',
  properties: {
    riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    summary: { type: 'string' },
    riskFactors: { type: 'array', items: { type: 'string' } },
    protectiveFactors: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    urgentActions: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'string' },
  },
  required: ['riskLevel', 'summary', 'riskFactors', 'protectiveFactors', 'recommendations', 'urgentActions', 'limitations'],
  additionalProperties: false,
} as const;

@Injectable()
export class AiReportsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(athleteId: string): Promise<AiRiskReportData[]> {
    const exists = await this.prisma.athlete.count({ where: { id: athleteId, deletedAt: null } });
    if (!exists) throw new NotFoundException('No encontramos este deportista.');
    const rows = await this.prisma.aiRiskReport.findMany({
      where: { athleteId, deletedAt: null },
      orderBy: { generatedAt: 'desc' },
    });
    return rows.map((item) => this.serialize(item));
  }

  async generate(userId: string, athleteId: string, participantId?: string): Promise<AiRiskReportData> {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('La generación asistida todavía no está configurada.');
    const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b';
    const athlete = await this.prisma.athlete.findFirst({
      where: { id: athleteId, deletedAt: null },
      include: {
        sport: true,
        sportsProgram: true,
        socialRecords: {
          where: { deletedAt: null },
          include: { householdMembers: { where: { deletedAt: null } } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        socioeconomicAssessments: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 1 },
        alerts: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } },
        followUpCases: {
          where: { deletedAt: null },
          include: { entries: { where: { deletedAt: null }, orderBy: { date: 'desc' }, take: 5 } },
          orderBy: { updatedAt: 'desc' },
        },
        observations: { where: { deletedAt: null }, orderBy: { date: 'desc' }, take: 10 },
        campaignParticipants: {
          where: { deletedAt: null, status: 'COMPLETED', ...(participantId ? { id: participantId } : {}) },
          include: {
            campaign: {
              include: {
                instrument: { include: { questions: { where: { deletedAt: null }, orderBy: { position: 'asc' } } } },
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: participantId ? 1 : 5,
        },
      },
    });
    if (!athlete) throw new NotFoundException('No encontramos este deportista.');
    if (participantId && athlete.campaignParticipants.length === 0) {
      throw new BadRequestException('El tamizaje indicado no está completado o no pertenece al deportista.');
    }

    const social = athlete.socialRecords[0];
    const assessment = athlete.socioeconomicAssessments[0];
    const source = {
      reference: athlete.id.slice(0, 8),
      age: this.age(athlete.birthDate),
      sex: athlete.sex,
      sport: athlete.sport.name,
      program: athlete.sportsProgram.name,
      education: { enrolled: athlete.currentlyEnrolled, grade: athlete.schoolGrade, shift: athlete.schoolShift },
      socialRecord: social ? {
        status: social.status,
        livingWith: social.livingWith,
        primaryCaregiver: social.primaryCaregiver,
        familyRelationships: social.familyRelationships,
        supportNetworks: social.supportNetworks,
        professionalObservation: social.professionalObservation,
        household: social.householdMembers.map((member) => ({
          relationship: member.relationship,
          approximateAge: member.approximateAge,
          livesWithAthlete: member.livesWithAthlete,
          occupation: member.occupation,
          relationshipQuality: member.relationshipQuality,
        })),
      } : null,
      socioeconomicAssessment: assessment ? {
        status: assessment.status,
        housingType: assessment.housingType,
        housingTenure: assessment.housingTenure,
        bedrooms: assessment.bedrooms,
        householdSize: assessment.householdSize,
        utilities: assessment.utilities,
        exclusiveKitchen: assessment.exclusiveKitchen,
        transportMode: assessment.transportMode,
        travelTime: assessment.travelTime,
        transportDifficulty: assessment.transportDifficulty,
        foodReduction: assessment.foodReduction,
        foodBeforeTraining: assessment.foodBeforeTraining,
        incomeRange: assessment.incomeRange,
        dependents: assessment.dependents,
        informedObservation: assessment.informedObservation,
        professionalAssessment: assessment.professionalAssessment,
      } : null,
      alerts: athlete.alerts.map((alert) => ({
        level: alert.level,
        status: alert.status,
        informedData: alert.informedData,
        indicator: alert.automaticIndicator,
        professionalAssessment: alert.professionalAssessment,
      })),
      followUps: athlete.followUpCases.map((followUp) => ({
        motive: followUp.motive,
        priority: followUp.priority,
        status: followUp.status,
        nextAction: followUp.nextAction,
        entries: followUp.entries.map((entry) => ({
          situation: entry.situation,
          actions: entry.actions,
          agreements: entry.agreements,
        })),
      })),
      observations: athlete.observations.map((observation) => ({
        type: observation.type,
        observation: observation.observation,
      })),
      screenings: athlete.campaignParticipants.map((participant) => ({
        participantId: participant.id,
        instrument: participant.campaign.instrument.name,
        completedAt: participant.completedAt,
        answers: participant.campaign.instrument.questions.map((question) => ({
          dimension: question.dimension,
          question: question.prompt,
          answer: (participant.responses as Prisma.JsonObject)[question.id],
        })),
      })),
    };
    const sourceJson = JSON.stringify(source);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: [
              'Eres un asistente de Trabajo Social que analiza población infantil y adolescente vinculada al deporte.',
              'Responde en español claro, profesional y respetuoso. No diagnostiques ni inventes hechos.',
              'Diferencia datos informados, indicadores automáticos e interpretación sugerida.',
              'El nivel de riesgo es una ayuda de priorización y siempre requiere validación profesional.',
              'Si faltan datos, indícalo en limitations. Solo propone acciones urgentes ante señales concretas.',
            ].join(' '),
          },
          { role: 'user', content: `Analiza este expediente seudonimizado y genera un borrador de informe de riesgo:\n${sourceJson}` },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'social_work_risk_report', strict: true, schema: reportSchema },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    }).catch(() => {
      throw new BadGatewayException('No fue posible comunicarse con el servicio de generación asistida.');
    });
    if (!response.ok) throw new BadGatewayException('El servicio de generación asistida no pudo preparar el informe.');
    const envelope = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = envelope.choices?.[0]?.message?.content;
    if (!content) throw new BadGatewayException('El servicio no devolvió un informe válido.');
    let generated: GeneratedRiskReport;
    try {
      generated = JSON.parse(content) as GeneratedRiskReport;
    } catch {
      throw new BadGatewayException('El servicio devolvió un formato de informe no válido.');
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(generated.riskLevel)) {
      throw new BadGatewayException('El nivel de riesgo generado no es válido.');
    }

    const saved = await this.prisma.aiRiskReport.create({
      data: {
        athleteId,
        sourceParticipantId: participantId || null,
        riskLevel: generated.riskLevel,
        summary: generated.summary,
        riskFactors: generated.riskFactors as Prisma.InputJsonValue,
        protectiveFactors: generated.protectiveFactors as Prisma.InputJsonValue,
        recommendations: generated.recommendations as Prisma.InputJsonValue,
        urgentActions: generated.urgentActions as Prisma.InputJsonValue,
        limitations: generated.limitations,
        model,
        sourceHash: createHash('sha256').update(sourceJson).digest('hex'),
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.audit.record({
      actorUserId: userId,
      action: 'ai-risk-report.generate',
      resourceType: 'AiRiskReport',
      resourceId: saved.id,
      metadata: { athleteId, participantId: participantId ?? null, model },
    });
    return this.serialize(saved);
  }

  async review(userId: string, id: string): Promise<AiRiskReportData> {
    const current = await this.prisma.aiRiskReport.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new NotFoundException('No encontramos este informe.');
    const saved = await this.prisma.aiRiskReport.update({
      where: { id },
      data: { status: 'REVIEWED', reviewedAt: new Date(), updatedBy: userId, version: { increment: 1 } },
    });
    await this.audit.record({ actorUserId: userId, action: 'ai-risk-report.review', resourceType: 'AiRiskReport', resourceId: id });
    return this.serialize(saved);
  }

  private age(birthDate: Date) {
    const today = new Date();
    let value = today.getFullYear() - birthDate.getFullYear();
    if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) value -= 1;
    return value;
  }

  private serialize(item: any): AiRiskReportData {
    return {
      id: item.id,
      athleteId: item.athleteId,
      sourceParticipantId: item.sourceParticipantId,
      riskLevel: item.riskLevel as AiRiskLevel,
      summary: item.summary,
      riskFactors: item.riskFactors as string[],
      protectiveFactors: item.protectiveFactors as string[],
      recommendations: item.recommendations as string[],
      urgentActions: item.urgentActions as string[],
      limitations: item.limitations,
      status: item.status,
      model: item.model,
      generatedAt: item.generatedAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      version: item.version,
    };
  }
}
