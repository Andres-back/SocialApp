import Dexie, { type EntityTable } from 'dexie';
import type { AlertData, AthleteRecord, FollowUpCaseData, NetworkDiagramData, ProfessionalObservationData, ScreeningCampaignData, ScreeningInstrumentData, SocialRecordData, SocioeconomicAssessmentData, SportsCatalogs, SyncMutation, SyncStatus } from '@socialapp/shared';

export interface LocalMutation extends SyncMutation {
  status: SyncStatus;
  attempts: number;
  lastError?: string;
  nextAttemptAt?: string;
  rejectionKind?: 'server' | 'transport';
  baseSnapshot?: unknown;
}

export interface DraftRecord {
  id: string;
  formType: string;
  subjectId?: string;
  data: unknown;
  updatedAt: string;
  createdBy: string;
}

export interface LocalMetadata {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface LocalCatalog {
  key: string;
  data: SportsCatalogs;
  updatedAt: string;
}
export interface LocalDiagram extends NetworkDiagramData { diagramType: 'genogram' | 'ecomap'; }

export class SocialAppDatabase extends Dexie {
  syncQueue!: EntityTable<LocalMutation, 'mutationId'>;
  drafts!: EntityTable<DraftRecord, 'id'>;
  metadata!: EntityTable<LocalMetadata, 'key'>;
  athletes!: EntityTable<AthleteRecord, 'id'>;
  socialRecords!: EntityTable<SocialRecordData, 'id'>;
  catalogs!: EntityTable<LocalCatalog, 'key'>;
  socioeconomicAssessments!: EntityTable<SocioeconomicAssessmentData, 'id'>;
  alerts!: EntityTable<AlertData, 'id'>;
  followUps!: EntityTable<FollowUpCaseData, 'id'>;
  observations!: EntityTable<ProfessionalObservationData, 'id'>;
  diagrams!: EntityTable<LocalDiagram, 'id'>;
  campaigns!: EntityTable<ScreeningCampaignData, 'id'>;
  instruments!: EntityTable<ScreeningInstrumentData, 'id'>;

  constructor(name = 'socialapp-local') {
    super(name);
    this.version(1).stores({
      syncQueue: 'mutationId, status, entityType, entityId, occurredAt, nextAttemptAt',
      drafts: 'id, formType, subjectId, updatedAt, createdBy',
      metadata: 'key, updatedAt',
    });
    this.version(2).stores({
      syncQueue: 'mutationId, status, entityType, entityId, occurredAt, nextAttemptAt',
      drafts: 'id, formType, subjectId, updatedAt, createdBy',
      metadata: 'key, updatedAt',
      athletes: 'id, internalCode, firstNames, lastNames, status, sportId, sportsProgramId, updatedAt, syncStatus',
      socialRecords: 'id, athleteId, status, updatedAt, syncStatus',
      catalogs: 'key, updatedAt',
    });
    this.version(3).stores({
      syncQueue: 'mutationId, status, entityType, entityId, occurredAt, nextAttemptAt',
      drafts: 'id, formType, subjectId, updatedAt, createdBy',
      metadata: 'key, updatedAt',
      athletes: 'id, internalCode, firstNames, lastNames, status, sportId, sportsProgramId, updatedAt, syncStatus',
      socialRecords: 'id, athleteId, status, updatedAt, syncStatus',
      catalogs: 'key, updatedAt',
      socioeconomicAssessments: 'id, athleteId, status, updatedAt, syncStatus',
      alerts: 'id, athleteId, status, level, updatedAt, syncStatus',
      followUps: 'id, athleteId, status, priority, estimatedDate, updatedAt, syncStatus',
      observations: 'id, athleteId, date, createdAt, syncStatus',
      diagrams: 'id, athleteId, diagramType, updatedAt, syncStatus',
      campaigns: 'id, date, status, updatedAt, syncStatus',
      instruments: 'id, name, version, active',
    });
  }
}

export const db = new SocialAppDatabase();

export async function enqueueMutation(
  mutation: Omit<LocalMutation, 'status' | 'attempts'>,
): Promise<void> {
  await db.syncQueue.add({ ...mutation, status: 'pending', attempts: 0 });
}

export async function pendingCount(): Promise<number> {
  return db.syncQueue.where('status').anyOf(['pending', 'processing', 'error', 'conflict']).count();
}
