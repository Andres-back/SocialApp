import { describe, expect, it } from 'vitest';
import type { AthleteInput, AthleteRecord } from '@socialapp/shared';
import { athleteRecordToInput, mergeConcurrentAthleteEdit } from './athlete-merge';

const remote: AthleteRecord = {
  id: 'bb48db7f-f0b8-4bbc-a6e3-00c5a049d168', internalCode: 'DEP-1', documentType: 'NONE', documentNumber: null,
  firstNames: 'Sara', lastNames: 'López', birthDate: '2014-06-15', age: 12, sex: 'FEMALE', municipality: 'Nuevo municipio', zone: 'URBAN',
  sportsProgramId: 'aeeb4ce5-379c-4f84-a093-fe866d344c09', sportsProgramName: 'Escuela', sportId: '915e01bb-c3dd-40fb-8eae-c876bfa8fa15', sportName: 'Voleibol',
  categoryId: '2bf97685-c5d6-4140-8b6e-d98948f65779', categoryName: '10 a 13 años', coachId: null, coachName: null,
  joinedAt: '2026-08-27', status: 'ACTIVE', schoolName: null, schoolGrade: null, schoolShift: null, currentlyEnrolled: true,
  guardian: { name: '', relationship: '', phone: '', email: null }, hasSocialRecord: false, socialRecordUpdatedAt: null,
  createdAt: '2026-08-27T00:00:00.000Z', updatedAt: '2026-08-31T00:00:00.000Z', version: 2,
};

describe('athlete concurrent merge', () => {
  const base = { ...athleteRecordToInput(remote), municipality: 'Municipio anterior', version: 1 } satisfies AthleteInput;

  it('combines edits made by two people in different fields', () => {
    const local = { ...base, schoolName: 'Colegio Central' };
    const result = mergeConcurrentAthleteEdit(base, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.merged).toMatchObject({ municipality: 'Nuevo municipio', schoolName: 'Colegio Central', version: 2 });
  });

  it('identifies only the field changed differently by both people', () => {
    const local = { ...base, municipality: 'Mi municipio' };
    const result = mergeConcurrentAthleteEdit(base, local, remote);
    expect(result.conflicts).toEqual(['municipality']);
  });
});
