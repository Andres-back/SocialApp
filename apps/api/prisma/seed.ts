import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { PERMISSIONS, ROLES } from '@socialapp/shared';

const prisma = new PrismaClient();

const permissionNames: Record<string, string> = {
  [PERMISSIONS.ATHLETE_READ]: 'Consultar deportistas', [PERMISSIONS.ATHLETE_WRITE]: 'Gestionar deportistas',
  [PERMISSIONS.SOCIAL_RECORD_READ]: 'Consultar información social', [PERMISSIONS.SOCIAL_RECORD_WRITE]: 'Gestionar información social',
  [PERMISSIONS.ASSESSMENT_READ]: 'Consultar caracterizaciones', [PERMISSIONS.ASSESSMENT_WRITE]: 'Gestionar caracterizaciones',
  [PERMISSIONS.SCREENING_READ]: 'Consultar tamizajes', [PERMISSIONS.SCREENING_WRITE]: 'Gestionar brigadas y tamizajes',
  [PERMISSIONS.ALERT_READ]: 'Consultar alertas', [PERMISSIONS.ALERT_WRITE]: 'Revisar alertas',
  [PERMISSIONS.FOLLOW_UP_READ]: 'Consultar seguimientos', [PERMISSIONS.FOLLOW_UP_WRITE]: 'Gestionar seguimientos',
  [PERMISSIONS.REPORT_EXPORT]: 'Exportar reportes', [PERMISSIONS.DIAGRAM_WRITE]: 'Gestionar familiogramas y ecomapas',
  [PERMISSIONS.DASHBOARD_AGGREGATE_READ]: 'Consultar indicadores consolidados', [PERMISSIONS.ADMIN_USERS]: 'Administrar usuarios',
  [PERMISSIONS.ADMIN_CATALOGS]: 'Administrar catálogos', [PERMISSIONS.AUDIT_READ]: 'Consultar auditoría',
  [PERMISSIONS.CATALOG_MANAGE]: 'Gestionar catálogos operativos',
  [PERMISSIONS.SYNC_EXECUTE]: 'Sincronizar información asignada',
};

const rolePermissions: Record<string, string[]> = {
  [ROLES.SOCIAL_WORKER]: [PERMISSIONS.ATHLETE_READ, PERMISSIONS.ATHLETE_WRITE, PERMISSIONS.SOCIAL_RECORD_READ, PERMISSIONS.SOCIAL_RECORD_WRITE, PERMISSIONS.ASSESSMENT_READ, PERMISSIONS.ASSESSMENT_WRITE, PERMISSIONS.SCREENING_READ, PERMISSIONS.SCREENING_WRITE, PERMISSIONS.ALERT_READ, PERMISSIONS.ALERT_WRITE, PERMISSIONS.FOLLOW_UP_READ, PERMISSIONS.FOLLOW_UP_WRITE, PERMISSIONS.REPORT_EXPORT, PERMISSIONS.DIAGRAM_WRITE, PERMISSIONS.DASHBOARD_AGGREGATE_READ, PERMISSIONS.CATALOG_MANAGE, PERMISSIONS.SYNC_EXECUTE],
  [ROLES.COACH]: [PERMISSIONS.ATHLETE_READ, PERMISSIONS.SYNC_EXECUTE],
  [ROLES.COORDINATOR]: [PERMISSIONS.DASHBOARD_AGGREGATE_READ],
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
};

async function main() {
  const permissions = new Map<string, string>();
  for (const [code, name] of Object.entries(permissionNames)) {
    const permission = await prisma.permission.upsert({ where: { code }, update: { name }, create: { code, name } });
    permissions.set(code, permission.id);
  }

  const roleNames: Record<string, string> = { [ROLES.SOCIAL_WORKER]: 'Trabajadora Social', [ROLES.COACH]: 'Entrenador', [ROLES.COORDINATOR]: 'Coordinador', [ROLES.ADMIN]: 'Administrador' };
  const roles = new Map<string, string>();
  for (const [code, name] of Object.entries(roleNames)) {
    const role = await prisma.role.upsert({ where: { code }, update: { name }, create: { code, name } });
    roles.set(code, role.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({ data: rolePermissions[code]!.map((permission) => ({ roleId: role.id, permissionId: permissions.get(permission)! })) });
  }

  const passwordHash = await argon2.hash('SocialApp2026!', { type: argon2.argon2id });
  const user = await prisma.user.upsert({ where: { email: 'trabajo.social@demo.local' }, update: { displayName: 'Sheynner Correa', passwordHash }, create: { email: 'trabajo.social@demo.local', displayName: 'Sheynner Correa', passwordHash } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roles.get(ROLES.SOCIAL_WORKER)! } }, update: {}, create: { userId: user.id, roleId: roles.get(ROLES.SOCIAL_WORKER)! } });
  const demoUsers = [
    { email: 'admin@demo.local', displayName: 'Administración Demo', role: ROLES.ADMIN },
    { email: 'coordinacion@demo.local', displayName: 'Coordinación Demo', role: ROLES.COORDINATOR },
    { email: 'entrenador@demo.local', displayName: 'Diego Ramírez', role: ROLES.COACH },
  ];
  for (const demo of demoUsers) {
    const demoUser = await prisma.user.upsert({ where: { email: demo.email }, update: { displayName: demo.displayName, passwordHash, status: 'ACTIVE' }, create: { email: demo.email, displayName: demo.displayName, passwordHash } });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: demoUser.id, roleId: roles.get(demo.role)! } }, update: {}, create: { userId: demoUser.id, roleId: roles.get(demo.role)! } });
  }

  const programNames = ['Semillero deportivo', 'Escuela de formación', 'Deporte asociado'];
  const sportNames = ['Atletismo', 'Baloncesto', 'Fútbol', 'Fútbol de salón', 'Natación', 'Voleibol'];
  const categoryNames = ['6 a 9 años', '10 a 13 años', '14 a 17 años'];
  const programs = new Map<string, string>();
  const sports = new Map<string, string>();
  const categories = new Map<string, string>();
  for (const name of programNames) {
    const item = await prisma.sportsProgram.upsert({ where: { name }, update: { active: true }, create: { name, createdBy: user.id, updatedBy: user.id } });
    programs.set(name, item.id);
  }
  for (const name of sportNames) {
    const item = await prisma.sport.upsert({ where: { name }, update: { active: true }, create: { name, createdBy: user.id, updatedBy: user.id } });
    sports.set(name, item.id);
  }
  for (const name of categoryNames) {
    const item = await prisma.category.upsert({ where: { name }, update: { active: true }, create: { name, createdBy: user.id, updatedBy: user.id } });
    categories.set(name, item.id);
  }
  let coach = await prisma.coach.findFirst({ where: { name: 'Diego Ramírez', deletedAt: null } });
  coach ??= await prisma.coach.create({ data: { name: 'Diego Ramírez', createdBy: user.id, updatedBy: user.id } });

  const sampleAthletes = [
    {
      internalCode: 'DEP-001', documentType: 'IDENTITY_CARD' as const, documentNumber: 'TEST-1001',
      firstNames: 'Ana', lastNames: 'Torres', birthDate: new Date('2015-04-12'), sex: 'FEMALE' as const,
      municipality: 'Municipio de prueba', zone: 'URBAN' as const, program: 'Escuela de formación', sport: 'Natación', category: '10 a 13 años',
      joinedAt: new Date('2025-02-10'), schoolName: 'Institución Educativa de Prueba', schoolGrade: 'Quinto', guardianName: 'Marta Torres', guardianRelationship: 'Madre',
    },
    {
      internalCode: 'DEP-002', documentType: 'IDENTITY_CARD' as const, documentNumber: 'TEST-1002',
      firstNames: 'Carlos', lastNames: 'Rojas', birthDate: new Date('2011-09-21'), sex: 'MALE' as const,
      municipality: 'Municipio de prueba', zone: 'URBAN' as const, program: 'Deporte asociado', sport: 'Fútbol', category: '14 a 17 años',
      joinedAt: new Date('2024-08-01'), schoolName: 'Colegio Deportivo de Prueba', schoolGrade: 'Noveno', guardianName: 'Elena Rojas', guardianRelationship: 'Madre',
    },
    {
      internalCode: 'DEP-003', documentType: 'CIVIL_REGISTRY' as const, documentNumber: 'TEST-1003',
      firstNames: 'María', lastNames: 'Gómez', birthDate: new Date('2017-01-18'), sex: 'FEMALE' as const,
      municipality: 'Zona rural de prueba', zone: 'RURAL' as const, program: 'Semillero deportivo', sport: 'Atletismo', category: '6 a 9 años',
      joinedAt: new Date('2026-01-20'), schoolName: 'Escuela Rural de Prueba', schoolGrade: 'Tercero', guardianName: 'José Gómez', guardianRelationship: 'Padre',
    },
  ];
  for (const sample of sampleAthletes) {
    await prisma.athlete.upsert({
      where: { internalCode: sample.internalCode },
      update: {},
      create: {
        internalCode: sample.internalCode,
        documentType: sample.documentType,
        documentNumber: sample.documentNumber,
        firstNames: sample.firstNames,
        lastNames: sample.lastNames,
        birthDate: sample.birthDate,
        sex: sample.sex,
        municipality: sample.municipality,
        zone: sample.zone,
        sportsProgramId: programs.get(sample.program)!,
        sportId: sports.get(sample.sport)!,
        categoryId: categories.get(sample.category)!,
        coachId: coach.id,
        joinedAt: sample.joinedAt,
        schoolName: sample.schoolName,
        schoolGrade: sample.schoolGrade,
        schoolShift: 'Mañana',
        currentlyEnrolled: true,
        createdBy: user.id,
        updatedBy: user.id,
        guardian: { create: { name: sample.guardianName, relationship: sample.guardianRelationship, phone: '3000000000', createdBy: user.id, updatedBy: user.id } },
      },
    });
  }

  let instrument = await prisma.screeningInstrument.findFirst({ where: { name: 'Tamizaje preventivo integral', version: 1 } });
  instrument ??= await prisma.screeningInstrument.create({ data: { name: 'Tamizaje preventivo integral', version: 1, ageGroup: '6 a 17 años', createdBy: user.id, updatedBy: user.id } });
  if (await prisma.screeningQuestion.count({ where: { instrumentId: instrument.id, deletedAt: null } }) === 0) {
    await prisma.screeningQuestion.createMany({ data: [
      { instrumentId: instrument.id, dimension: 'Entorno familiar', prompt: '¿Cuenta con una persona adulta de confianza cuando necesita apoyo?', type: 'YES_NO', options: ['Sí', 'No'], position: 1, createdBy: user.id, updatedBy: user.id },
      { instrumentId: instrument.id, dimension: 'Entorno escolar', prompt: '¿La asistencia al colegio ha sido regular durante el último mes?', type: 'SINGLE_CHOICE', options: ['Sí', 'Algunas veces', 'No'], position: 2, createdBy: user.id, updatedBy: user.id },
      { instrumentId: instrument.id, dimension: 'Participación deportiva', prompt: '¿Ha tenido dificultades para asistir a los entrenamientos?', type: 'SINGLE_CHOICE', options: ['Nunca', 'Algunas veces', 'Frecuentemente'], position: 3, createdBy: user.id, updatedBy: user.id },
      { instrumentId: instrument.id, dimension: 'Redes de apoyo', prompt: '¿Identifica personas o instituciones que puedan ayudarle?', type: 'YES_NO', options: ['Sí', 'No'], position: 4, createdBy: user.id, updatedBy: user.id },
      { instrumentId: instrument.id, dimension: 'Bienestar general', prompt: '¿Cómo valora su bienestar general esta semana?', type: 'SCALE', options: ['1', '2', '3', '4', '5'], position: 5, createdBy: user.id, updatedBy: user.id },
    ] });
  }

  const screeningQuestions = await prisma.screeningQuestion.findMany({
    where: { instrumentId: instrument.id, deletedAt: null },
    orderBy: { position: 'asc' },
  });
  const attendanceQuestion = screeningQuestions.find((question) => question.position === 3);
  const supportQuestion = screeningQuestions.find((question) => question.position === 4);

  const rules = [
    { name: 'Barrera frecuente de transporte', source: 'SOCIOECONOMIC', field: 'transportDifficulty', operator: 'EQUALS', expectedValue: 'FREQUENTLY', indicator: 'Posible barrera relacionada con transporte', level: 'YELLOW' as const },
    { name: 'Red de apoyo no identificada', source: 'SCREENING', field: supportQuestion?.id ?? 'supportNetwork', operator: 'EQUALS', expectedValue: 'No', indicator: 'Red de apoyo limitada o no identificada', level: 'YELLOW' as const },
    { name: 'Dificultad reiterada de asistencia', source: 'SCREENING', field: attendanceQuestion?.id ?? 'attendanceBarrier', operator: 'EQUALS', expectedValue: 'Frecuentemente', indicator: 'Respuestas que ameritan valoración prioritaria por Trabajo Social', level: 'RED' as const },
  ];
  for (const rule of rules) {
    const existingRule = await prisma.configurableRule.findFirst({ where: { name: rule.name, deletedAt: null } });
    if (existingRule) await prisma.configurableRule.update({ where: { id: existingRule.id }, data: { ...rule, active: true, updatedBy: user.id } });
    else await prisma.configurableRule.create({ data: { ...rule, createdBy: user.id, updatedBy: user.id } });
  }
}

main().finally(async () => prisma.$disconnect());
