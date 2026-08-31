import type { AthleteInput, AthleteRecord } from '@socialapp/shared';

export type AthleteMergeField = Exclude<keyof AthleteInput, 'id' | 'version' | 'guardian'>
  | 'guardian.name'
  | 'guardian.relationship'
  | 'guardian.phone'
  | 'guardian.email';

export const athleteFieldLabels: Record<AthleteMergeField, string> = {
  internalCode: 'Código interno',
  documentType: 'Tipo de documento',
  documentNumber: 'Número de documento',
  firstNames: 'Nombres',
  lastNames: 'Apellidos',
  birthDate: 'Fecha de nacimiento',
  sex: 'Sexo',
  municipality: 'Municipio',
  zone: 'Zona',
  sportsProgramId: 'Programa deportivo',
  sportId: 'Deporte',
  categoryId: 'Categoría',
  coachId: 'Entrenador',
  joinedAt: 'Fecha de ingreso',
  status: 'Estado',
  schoolName: 'Institución educativa',
  schoolGrade: 'Grado',
  schoolShift: 'Jornada',
  currentlyEnrolled: 'Escolarización',
  'guardian.name': 'Nombre del acudiente',
  'guardian.relationship': 'Parentesco del acudiente',
  'guardian.phone': 'Teléfono del acudiente',
  'guardian.email': 'Correo del acudiente',
};

const fields = Object.keys(athleteFieldLabels) as AthleteMergeField[];

function valueAt(input: AthleteInput, field: AthleteMergeField): unknown {
  if (!field.startsWith('guardian.')) return (input as unknown as Record<string, unknown>)[field];
  return input.guardian?.[field.slice('guardian.'.length) as keyof NonNullable<AthleteInput['guardian']>] ?? null;
}

function same(left: unknown, right: unknown): boolean {
  return (left ?? null) === (right ?? null);
}

function setValue(input: AthleteInput, field: AthleteMergeField, value: unknown): void {
  if (!field.startsWith('guardian.')) {
    (input as unknown as Record<string, unknown>)[field] = value;
    return;
  }
  const key = field.slice('guardian.'.length) as keyof NonNullable<AthleteInput['guardian']>;
  const guardian: NonNullable<AthleteInput['guardian']> = { name: '', relationship: '', phone: '', email: null, ...(input.guardian ?? {}) };
  (guardian as unknown as Record<string, unknown>)[key] = value;
  input.guardian = guardian;
}

export function athleteRecordToInput(record: AthleteRecord): AthleteInput {
  return {
    id: record.id,
    internalCode: record.internalCode,
    documentType: record.documentType,
    documentNumber: record.documentNumber ?? null,
    firstNames: record.firstNames,
    lastNames: record.lastNames,
    birthDate: record.birthDate,
    sex: record.sex,
    municipality: record.municipality,
    zone: record.zone,
    sportsProgramId: record.sportsProgramId,
    sportId: record.sportId,
    categoryId: record.categoryId,
    coachId: record.coachId ?? null,
    joinedAt: record.joinedAt,
    status: record.status,
    schoolName: record.schoolName ?? null,
    schoolGrade: record.schoolGrade ?? null,
    schoolShift: record.schoolShift ?? null,
    currentlyEnrolled: record.currentlyEnrolled,
    guardian: { ...record.guardian },
    version: record.version,
  };
}

export function mergeConcurrentAthleteEdit(base: AthleteInput, local: AthleteInput, remoteRecord: AthleteRecord) {
  const remote = athleteRecordToInput(remoteRecord);
  const localChanges = fields.filter((field) => !same(valueAt(base, field), valueAt(local, field)));
  const remoteChanges = new Set(fields.filter((field) => !same(valueAt(base, field), valueAt(remote, field))));
  const conflicts = localChanges.filter((field) => remoteChanges.has(field) && !same(valueAt(local, field), valueAt(remote, field)));
  const merged: AthleteInput = { ...remote, guardian: { name: '', relationship: '', phone: '', email: null, ...(remote.guardian ?? {}) }, version: remote.version };
  for (const field of localChanges) setValue(merged, field, valueAt(local, field));
  return { merged, conflicts, localChanges };
}
