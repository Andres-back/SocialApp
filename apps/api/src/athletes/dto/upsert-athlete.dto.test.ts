import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpsertAthleteDto } from './upsert-athlete.dto';

const valid = {
  id: '9ecace92-695d-48ed-b9af-f1a1e456a690',
  internalCode: 'DEP-100',
  documentType: 'IDENTITY_CARD',
  documentNumber: 'TEST-2000',
  firstNames: 'Persona',
  lastNames: 'De Prueba',
  birthDate: '2014-05-03',
  sex: 'FEMALE',
  municipality: 'Municipio de prueba',
  zone: 'URBAN',
  sportsProgramId: 'b13f255f-889d-418a-85d1-7bc83a74f93a',
  sportId: '32432de8-2b6b-4661-b243-aa013a81832f',
  categoryId: 'd288c9d2-865c-4ed8-a774-e71d60aed252',
  coachId: null,
  joinedAt: '2026-01-10',
  status: 'ACTIVE',
  currentlyEnrolled: true,
  guardian: { name: 'Acudiente de Prueba', relationship: 'Madre', phone: '3000000000', email: null },
  version: 0,
};

describe('UpsertAthleteDto', () => {
  it('accepts a complete fictitious athlete', async () => {
    expect(await validate(plainToInstance(UpsertAthleteDto, valid))).toHaveLength(0);
  });
  it('accepts registration without guardian information', async () => {
    const withoutGuardian: Record<string, unknown> = { ...valid };
    delete withoutGuardian.guardian;
    expect(await validate(plainToInstance(UpsertAthleteDto, withoutGuardian))).toHaveLength(0);
  });
  it('rejects an unknown status and an invalid guardian phone', async () => {
    const errors = await validate(plainToInstance(UpsertAthleteDto, { ...valid, status: 'UNKNOWN', guardian: { ...valid.guardian, phone: '12' } }));
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['status', 'guardian']));
  });
});
