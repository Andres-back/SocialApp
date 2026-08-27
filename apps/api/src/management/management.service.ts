import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminUserData, AuditLogData, ConfigurableRuleData, DashboardData, ReportPopulationData, RoleCode } from '@socialapp/shared';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { AthletesService } from '../athletes/athletes.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkService } from '../work/work.service';

@Injectable()
export class ManagementService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly athletes: AthletesService, private readonly work: WorkService) {}

  async dashboard(filters: Record<string, string> = {}): Promise<DashboardData> {
    const rows = await this.prisma.athlete.findMany({
      where: {
        deletedAt: null,
        ...(filters.programId ? { sportsProgramId: filters.programId } : {}),
        ...(filters.sportId ? { sportId: filters.sportId } : {}),
        ...(filters.status ? { status: filters.status as any } : {}),
      },
      include: {
        sportsProgram: true, sport: true,
        socialRecords: { where: { deletedAt: null, status: 'COMPLETED' }, take: 1 },
        socioeconomicAssessments: { where: { deletedAt: null, status: 'COMPLETED' }, orderBy: { updatedAt: 'desc' }, take: 1 },
        campaignParticipants: { where: { deletedAt: null, status: 'COMPLETED' } },
        followUpCases: { where: { deletedAt: null } },
        alerts: { where: { deletedAt: null, status: 'PENDING' } },
      },
    });
    const grouped = (values: string[]) => Object.entries(values.reduce<Record<string, number>>((acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }), {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const ageGroup = (date: Date) => {
      const age = Math.floor((Date.now() - date.getTime()) / 31_557_600_000);
      return age <= 9 ? '6 a 9 años' : age <= 13 ? '10 a 13 años' : '14 a 17 años';
    };
    const assessments = rows.flatMap((item) => item.socioeconomicAssessments);
    const barrierValues = [
      ...assessments.filter((item) => item.transportDifficulty === 'FREQUENTLY').map(() => 'Transporte'),
      ...assessments.filter((item) => item.foodReduction === 'FREQUENTLY' || item.foodReduction === 'SOMETIMES').map(() => 'Seguridad alimentaria'),
      ...assessments.filter((item) => !item.utilities.includes('POTABLE_WATER')).map(() => 'Agua potable'),
      ...assessments.filter((item) => !item.exclusiveKitchen).map(() => 'Espacio para cocinar'),
    ];
    const upcoming = await this.prisma.followUpCase.findMany({ where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] }, estimatedDate: { not: null }, ...(rows.length ? { athleteId: { in: rows.map((item) => item.id) } } : { athleteId: { in: [] } }) }, include: { athlete: true }, orderBy: { estimatedDate: 'asc' }, take: 8 });
    return {
      athletes: rows.length,
      socialRecords: rows.filter((item) => item.socialRecords.length > 0).length,
      socioeconomicAssessments: rows.filter((item) => item.socioeconomicAssessments.length > 0).length,
      screenings: rows.reduce((total, item) => total + item.campaignParticipants.length, 0),
      openFollowUps: rows.reduce((total, item) => total + item.followUpCases.filter((followUp) => followUp.status === 'OPEN' || followUp.status === 'IN_PROGRESS').length, 0),
      highPriorityFollowUps: rows.reduce((total, item) => total + item.followUpCases.filter((followUp) => followUp.priority === 'HIGH' && followUp.status !== 'CLOSED').length, 0),
      pendingAlerts: rows.reduce((total, item) => total + item.alerts.length, 0),
      programs: grouped(rows.map((item) => item.sportsProgram.name)),
      sports: grouped(rows.map((item) => item.sport.name)),
      sexes: grouped(rows.map((item) => item.sex)),
      ageGroups: grouped(rows.map((item) => ageGroup(item.birthDate))),
      barriers: grouped(barrierValues),
      upcomingFollowUps: upcoming.map((item) => ({ id: item.id, athleteId: item.athleteId, athleteName: `${item.athlete.firstNames} ${item.athlete.lastNames}`, date: item.estimatedDate!.toISOString().slice(0, 10), motive: item.motive, priority: item.priority })),
    };
  }

  async populationReport(filters: Record<string, string>): Promise<ReportPopulationData> {
    return { ...(await this.dashboard(filters)), generatedAt: new Date().toISOString(), filters };
  }
  async individualReport(athleteId: string, userId: string) {
    return { athlete: await this.athletes.get(athleteId, userId), workspace: await this.work.workspace(athleteId, userId), generatedAt: new Date().toISOString() };
  }
  async populationCsv(filters: Record<string, string>, userId: string) {
    const report = await this.populationReport(filters);
    await this.audit.record({ actorUserId: userId, action: 'report.export', resourceType: 'PopulationReport', metadata: { format: 'CSV', filters } });
    const lines = [
      ['Indicador', 'Valor'],
      ['Deportistas', report.athletes],
      ['Fichas sociales', report.socialRecords],
      ['Caracterizaciones', report.socioeconomicAssessments],
      ['Tamizajes', report.screenings],
      ['Seguimientos abiertos', report.openFollowUps],
      ['Alertas pendientes', report.pendingAlerts],
      ...report.programs.map((item) => [`Programa: ${item.name}`, item.count]),
      ...report.sports.map((item) => [`Deporte: ${item.name}`, item.count]),
    ];
    return '\uFEFF' + lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  }
  async auditExport(userId: string, body: { type: string; athleteId?: string }) {
    await this.audit.record({ actorUserId: userId, action: 'report.export', resourceType: body.type, resourceId: body.athleteId, metadata: { format: 'PDF_PRINT' } });
    return { success: true };
  }

  async adminOverview() {
    const [users, rules, auditLogs, programs, sports, categories, coaches, instruments] = await Promise.all([
      this.prisma.user.findMany({ where: { deletedAt: null }, include: { roles: { include: { role: true } } }, orderBy: { displayName: 'asc' } }),
      this.prisma.configurableRule.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.sportsProgram.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.sport.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.category.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.coach.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.screeningInstrument.findMany({ where: { deletedAt: null }, include: { questions: { where: { deletedAt: null }, orderBy: { position: 'asc' } } }, orderBy: { name: 'asc' } }),
    ]);
    return {
      users: users.map((item): AdminUserData => ({ id: item.id, email: item.email, displayName: item.displayName, status: item.status, roles: item.roles.map((role) => role.role.code as RoleCode), lastLoginAt: item.lastLoginAt?.toISOString() ?? null })),
      rules: rules.map((item): ConfigurableRuleData => ({ id: item.id, name: item.name, source: item.source, field: item.field, operator: item.operator as ConfigurableRuleData['operator'], expectedValue: item.expectedValue, indicator: item.indicator, level: item.level, active: item.active, version: item.version })),
      auditLogs: auditLogs.map((item): AuditLogData => ({ id: item.id, actorName: item.actor?.displayName ?? null, action: item.action, resourceType: item.resourceType, resourceId: item.resourceId, outcome: item.outcome, createdAt: item.createdAt.toISOString() })),
      catalogs: { programs, sports, categories, coaches },
      instruments: instruments.map((item) => ({ ...item, questions: item.questions.map((question) => ({ ...question, options: question.options })) })),
    };
  }
  async createCatalog(userId: string, kind: string, name: string) {
    if (!name.trim()) throw new BadRequestException('Escribe un nombre para el catálogo.');
    const delegates: Record<string, any> = { programs: this.prisma.sportsProgram, sports: this.prisma.sport, categories: this.prisma.category, coaches: this.prisma.coach };
    const delegate = delegates[kind];
    if (!delegate) throw new BadRequestException('Catálogo no válido.');
    const item = kind === 'coaches' ? await delegate.create({ data: { name: name.trim(), createdBy: userId, updatedBy: userId } }) : await delegate.upsert({ where: { name: name.trim() }, update: { active: true, deletedAt: null, updatedBy: userId }, create: { name: name.trim(), createdBy: userId, updatedBy: userId } });
    await this.audit.record({ actorUserId: userId, action: 'catalog.create', resourceType: kind, resourceId: item.id });
    return item;
  }
  async saveRule(userId: string, body: Record<string, unknown>) {
    const required = ['id', 'name', 'source', 'field', 'operator', 'expectedValue', 'indicator', 'level'];
    if (required.some((key) => !body[key])) throw new BadRequestException('Completa todos los campos de la regla.');
    const item = await this.prisma.configurableRule.upsert({ where: { id: String(body.id) }, update: { name: String(body.name), source: String(body.source), field: String(body.field), operator: String(body.operator), expectedValue: String(body.expectedValue), indicator: String(body.indicator), level: body.level as any, active: body.active !== false, updatedBy: userId, version: { increment: 1 } }, create: { id: String(body.id), name: String(body.name), source: String(body.source), field: String(body.field), operator: String(body.operator), expectedValue: String(body.expectedValue), indicator: String(body.indicator), level: body.level as any, active: body.active !== false, createdBy: userId, updatedBy: userId } });
    await this.audit.record({ actorUserId: userId, action: 'rule.save', resourceType: 'ConfigurableRule', resourceId: item.id });
    return item;
  }
  async saveInstrument(userId: string, body: Record<string, unknown>) {
    const id = String(body.id || crypto.randomUUID());
    const name = String(body.name || '').trim();
    const questions = Array.isArray(body.questions) ? body.questions as Record<string, unknown>[] : [];
    if (!name || questions.length === 0) throw new BadRequestException('El instrumento necesita nombre y al menos una pregunta.');
    const item = await this.prisma.$transaction(async (tx) => {
      const instrument = await tx.screeningInstrument.upsert({ where: { id }, update: { name, ageGroup: body.ageGroup ? String(body.ageGroup) : null, active: body.active !== false, updatedBy: userId }, create: { id, name, version: Number(body.version || 1), ageGroup: body.ageGroup ? String(body.ageGroup) : null, active: body.active !== false, createdBy: userId, updatedBy: userId } });
      await tx.screeningQuestion.updateMany({ where: { instrumentId: id }, data: { deletedAt: new Date(), updatedBy: userId } });
      for (const [position, question] of questions.entries()) await tx.screeningQuestion.create({ data: { id: String(question.id || crypto.randomUUID()), instrumentId: id, dimension: String(question.dimension || 'General'), prompt: String(question.prompt || ''), type: String(question.type || 'YES_NO'), options: (question.options ?? []) as Prisma.InputJsonValue, required: question.required !== false, position, createdBy: userId, updatedBy: userId } });
      return instrument;
    });
    await this.audit.record({ actorUserId: userId, action: 'instrument.save', resourceType: 'ScreeningInstrument', resourceId: item.id });
    return item;
  }
  async createUser(userId: string, body: { email: string; displayName: string; password: string; roles: string[] }) {
    if (!body.email || !body.displayName || body.password.length < 10 || body.roles.length === 0) throw new BadRequestException('Completa los datos. La contraseña debe tener al menos 10 caracteres.');
    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email: body.email.toLowerCase(), displayName: body.displayName, passwordHash, createdBy: userId, updatedBy: userId } });
      const roles = await tx.role.findMany({ where: { code: { in: body.roles } } });
      await tx.userRole.createMany({ data: roles.map((role) => ({ userId: created.id, roleId: role.id, assignedBy: userId })) });
      return created;
    });
    await this.audit.record({ actorUserId: userId, action: 'user.create', resourceType: 'User', resourceId: user.id });
    return { id: user.id, email: user.email, displayName: user.displayName, status: user.status };
  }
  async updateUserStatus(userId: string, id: string, status: 'ACTIVE' | 'INACTIVE' | 'LOCKED') {
    const user = await this.prisma.user.update({ where: { id }, data: { status, updatedBy: userId, version: { increment: 1 }, refreshTokens: status === 'ACTIVE' ? undefined : { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } } } } });
    await this.audit.record({ actorUserId: userId, action: 'user.status-change', resourceType: 'User', resourceId: id, metadata: { status } });
    return { id: user.id, status: user.status };
  }
}
