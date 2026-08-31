export const ROLES = {
  SOCIAL_WORKER: 'SOCIAL_WORKER',
  COACH: 'COACH',
  COORDINATOR: 'COORDINATOR',
  ADMIN: 'ADMIN',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  ATHLETE_READ: 'athlete:read',
  ATHLETE_WRITE: 'athlete:write',
  SOCIAL_RECORD_READ: 'social-record:read',
  SOCIAL_RECORD_WRITE: 'social-record:write',
  ASSESSMENT_READ: 'assessment:read',
  ASSESSMENT_WRITE: 'assessment:write',
  SCREENING_READ: 'screening:read',
  SCREENING_WRITE: 'screening:write',
  ALERT_READ: 'alert:read',
  ALERT_WRITE: 'alert:write',
  FOLLOW_UP_READ: 'follow-up:read',
  FOLLOW_UP_WRITE: 'follow-up:write',
  REPORT_EXPORT: 'report:export',
  DIAGRAM_WRITE: 'diagram:write',
  DASHBOARD_AGGREGATE_READ: 'dashboard:aggregate:read',
  ADMIN_USERS: 'admin:users',
  ADMIN_CATALOGS: 'admin:catalogs',
  CATALOG_MANAGE: 'catalog:manage',
  AUDIT_READ: 'audit:read',
  SYNC_EXECUTE: 'sync:execute',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type SyncStatus = 'pending' | 'processing' | 'synced' | 'error' | 'conflict';
export type SyncOperation = 'create' | 'update' | 'delete';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: RoleCode[];
  permissions: PermissionCode[];
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface SyncMutation<TPayload = unknown> {
  mutationId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  baseVersion: number;
  occurredAt: string;
  payload: TPayload;
}

export interface SyncMutationResult {
  mutationId: string;
  status: 'accepted' | 'rejected' | 'conflict';
  serverVersion?: number;
  message?: string;
}

export interface SyncPushResponse {
  results: SyncMutationResult[];
  serverTime: string;
}

export const DOCUMENT_TYPES = ['CIVIL_REGISTRY', 'IDENTITY_CARD', 'PASSPORT', 'PERMIT', 'NONE', 'OTHER'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const ATHLETE_STATUSES = ['ACTIVE', 'RETIRED', 'SUSPENDED', 'OTHER'] as const;
export type AthleteStatus = (typeof ATHLETE_STATUSES)[number];
export const ZONES = ['UNSPECIFIED', 'URBAN', 'RURAL'] as const;
export type Zone = (typeof ZONES)[number];
export const SEX_OPTIONS = ['FEMALE', 'MALE', 'INTERSEX', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
export type Sex = (typeof SEX_OPTIONS)[number];

export interface CatalogItem {
  id: string;
  name: string;
}

export interface SportsCatalogs {
  programs: CatalogItem[];
  sports: CatalogItem[];
  categories: CatalogItem[];
  coaches: CatalogItem[];
}

export interface ManageableCatalogItem extends CatalogItem {
  active: boolean;
  usageCount: number;
}

export interface ManageableSportsCatalogs {
  programs: ManageableCatalogItem[];
  sports: ManageableCatalogItem[];
  categories: ManageableCatalogItem[];
  coaches: ManageableCatalogItem[];
}

export interface GuardianData {
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
}

export interface AthleteRecord {
  id: string;
  internalCode: string;
  documentType: DocumentType;
  documentNumber?: string | null;
  firstNames: string;
  lastNames: string;
  birthDate: string;
  age: number;
  sex: Sex;
  municipality: string;
  zone: Zone;
  sportsProgramId: string;
  sportsProgramName: string;
  sportId: string;
  sportName: string;
  categoryId: string;
  categoryName: string;
  coachId?: string | null;
  coachName?: string | null;
  joinedAt: string;
  status: AthleteStatus;
  schoolName?: string | null;
  schoolGrade?: string | null;
  schoolShift?: string | null;
  currentlyEnrolled: boolean;
  guardian: GuardianData;
  hasSocialRecord: boolean;
  socialRecordUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  syncStatus?: SyncStatus;
}

export interface AthleteInput {
  id: string;
  internalCode: string;
  documentType: DocumentType;
  documentNumber?: string | null;
  firstNames: string;
  lastNames: string;
  birthDate: string;
  sex: Sex;
  municipality: string;
  zone: Zone;
  sportsProgramId: string;
  sportId: string;
  categoryId: string;
  coachId?: string | null;
  joinedAt: string;
  status: AthleteStatus;
  schoolName?: string | null;
  schoolGrade?: string | null;
  schoolShift?: string | null;
  currentlyEnrolled: boolean;
  guardian?: GuardianData;
  version: number;
}

export type RelationshipQuality = 'CLOSE' | 'ADEQUATE' | 'DISTANT' | 'CONFLICTIVE' | 'UNKNOWN';
export type FamilyRelationshipRating = 'VERY_GOOD' | 'GOOD' | 'REGULAR' | 'DIFFICULT';
export type PrimaryCaregiver = 'MOTHER' | 'FATHER' | 'BOTH' | 'GRANDPARENT' | 'OTHER_RELATIVE' | 'OTHER';
export type SocialRecordStatus = 'DRAFT' | 'COMPLETED';

export interface HouseholdMemberInput {
  id: string;
  name: string;
  relationship: string;
  approximateAge?: number | null;
  livesWithAthlete: boolean;
  occupation?: string | null;
  relationshipQuality: RelationshipQuality;
}

export interface SocialRecordInput {
  id: string;
  athleteId: string;
  instrumentVersion: number;
  status: SocialRecordStatus;
  livingWith: string[];
  householdMembers: HouseholdMemberInput[];
  primaryCaregiver: PrimaryCaregiver;
  otherCaregiver?: string | null;
  familyRelationships: FamilyRelationshipRating;
  supportNetworks: string[];
  otherSupportNetwork?: string | null;
  professionalObservation?: string | null;
  completedAt?: string | null;
  version: number;
}

export interface SocialRecordData extends SocialRecordInput {
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}

export type AssessmentStatus = 'DRAFT' | 'COMPLETED';
export type HousingType = 'HOUSE' | 'APARTMENT' | 'OTHER';
export type HousingTenure = 'OWNED' | 'RENTED' | 'FAMILY' | 'OTHER';
export type TransportMode = 'WALKING' | 'BICYCLE' | 'PUBLIC_TRANSPORT' | 'MOTORCYCLE' | 'FAMILY_TRANSPORT' | 'INSTITUTIONAL_TRANSPORT' | 'OTHER';
export type TravelTime = 'UNDER_15' | 'FROM_15_TO_30' | 'FROM_31_TO_60' | 'OVER_60';
export type Frequency = 'NEVER' | 'SOMETIMES' | 'FREQUENTLY';
export type FoodBeforeTraining = 'ALWAYS' | 'SOMETIMES' | 'RARELY' | 'NEVER';
export type IncomeRange = 'UNDER_1_SMMLV' | 'FROM_1_TO_2_SMMLV' | 'FROM_2_TO_3_SMMLV' | 'OVER_3_SMMLV' | 'PREFER_NOT_TO_SAY';

export interface SocioeconomicAssessmentInput {
  id: string;
  athleteId: string;
  instrumentVersion: number;
  status: AssessmentStatus;
  housingType: HousingType;
  housingTenure: HousingTenure;
  bedrooms: number;
  householdSize: number;
  zone: Zone;
  utilities: string[];
  exclusiveKitchen: boolean;
  transportMode: TransportMode;
  travelTime: TravelTime;
  transportDifficulty: Frequency;
  foodReduction: Frequency;
  foodBeforeTraining: FoodBeforeTraining;
  incomeRange: IncomeRange;
  dependents: number;
  informedObservation?: string | null;
  professionalAssessment?: string | null;
  completedAt?: string | null;
  version: number;
}

export interface SocioeconomicAssessmentData extends SocioeconomicAssessmentInput {
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}

export type AlertLevel = 'GREEN' | 'YELLOW' | 'RED';
export type AlertStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED';
export interface AlertData {
  id: string;
  athleteId: string;
  sourceType: string;
  sourceId?: string | null;
  level: AlertLevel;
  status: AlertStatus;
  informedData?: string | null;
  automaticIndicator: string;
  professionalAssessment?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  syncStatus?: SyncStatus;
}

export type FollowUpStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'REFERRED';
export type FollowUpPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export interface FollowUpEntryInput {
  id: string;
  followUpCaseId: string;
  date: string;
  situation: string;
  actions: string;
  agreements: string;
  responsible: string;
  nextAction?: string | null;
  estimatedDate?: string | null;
}
export interface FollowUpEntryData extends FollowUpEntryInput {
  professionalName: string;
  createdAt: string;
}
export interface FollowUpCaseInput {
  id: string;
  athleteId: string;
  motive: string;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  responsible: string;
  nextAction?: string | null;
  estimatedDate?: string | null;
  version: number;
}
export interface FollowUpCaseData extends FollowUpCaseInput {
  professionalName: string;
  entries: FollowUpEntryData[];
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}

export type ObservationVisibility = 'SOCIAL_WORK_ONLY' | 'AUTHORIZED_TEAM' | 'INSTITUTIONAL_SUMMARY';
export interface ProfessionalObservationData {
  id: string;
  athleteId: string;
  date: string;
  type: string;
  observation: string;
  visibility: ObservationVisibility;
  professionalName: string;
  createdAt: string;
  syncStatus?: SyncStatus;
}

export interface DiagramNode {
  id: string;
  label: string;
  kind: string;
  x: number;
  y: number;
  metadata?: Record<string, string | boolean | number | null>;
}
export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}
export interface NetworkDiagramData {
  id: string;
  athleteId: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  version: number;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}

export type CampaignStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';
export type ScreeningParticipantStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export interface ScreeningQuestionData {
  id: string;
  dimension: string;
  prompt: string;
  type: 'YES_NO' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT' | 'NUMBER' | 'SCALE';
  options: string[];
  required: boolean;
  position: number;
}
export interface ScreeningInstrumentData {
  id: string;
  name: string;
  version: number;
  ageGroup?: string | null;
  questions: ScreeningQuestionData[];
  active: boolean;
}
export interface ScreeningInstrumentInput {
  id?: string;
  name: string;
  ageGroup: string;
  active: boolean;
  questions: Array<Omit<ScreeningQuestionData, 'position'> & { position?: number }>;
}

export type ScreeningAgeGroup = '6 a 9 años' | '10 a 13 años' | '14 a 17 años';

export function screeningAgeGroup(age: number): ScreeningAgeGroup | null {
  if (age >= 6 && age <= 9) return '6 a 9 años';
  if (age >= 10 && age <= 13) return '10 a 13 años';
  if (age >= 14 && age <= 17) return '14 a 17 años';
  return null;
}

export function instrumentMatchesAge(instrument: Pick<ScreeningInstrumentData, 'ageGroup'>, age: number): boolean {
  return screeningAgeGroup(age) === instrument.ageGroup;
}
export interface CampaignParticipantData {
  id: string;
  athleteId: string;
  athleteName: string;
  status: ScreeningParticipantStatus;
  responses: Record<string, unknown>;
  completedAt?: string | null;
  version: number;
  syncStatus?: SyncStatus;
}
export interface ScreeningCampaignInput {
  id: string;
  name: string;
  date: string;
  place: string;
  sportsProgramId?: string | null;
  sportId?: string | null;
  instrumentId: string;
  professionalName: string;
  athleteIds: string[];
  status: CampaignStatus;
  version: number;
}
export interface ScreeningCampaignData extends ScreeningCampaignInput {
  sportsProgramName?: string | null;
  sportName?: string | null;
  instrument: ScreeningInstrumentData;
  participants: CampaignParticipantData[];
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  detail?: string | null;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface AthleteWorkspace {
  socioeconomicAssessment: SocioeconomicAssessmentData | null;
  alerts: AlertData[];
  followUps: FollowUpCaseData[];
  observations: ProfessionalObservationData[];
  genogram: NetworkDiagramData | null;
  ecomap: NetworkDiagramData | null;
  timeline: TimelineEvent[];
}

export interface DashboardData {
  athletes: number;
  socialRecords: number;
  socioeconomicAssessments: number;
  screenings: number;
  openFollowUps: number;
  highPriorityFollowUps: number;
  pendingAlerts: number;
  programs: { name: string; count: number }[];
  sports: { name: string; count: number }[];
  sexes: { name: string; count: number }[];
  ageGroups: { name: string; count: number }[];
  barriers: { name: string; count: number }[];
  upcomingFollowUps: { id: string; athleteId: string; athleteName: string; date: string; motive: string; priority: FollowUpPriority }[];
}

export interface ConfigurableRuleData {
  id: string;
  name: string;
  source: string;
  field: string;
  operator: 'EQUALS' | 'INCLUDES' | 'GREATER_THAN';
  expectedValue: string;
  indicator: string;
  level: AlertLevel;
  active: boolean;
  version: number;
}

export interface AdminUserData {
  id: string;
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  roles: RoleCode[];
  lastLoginAt?: string | null;
}

export interface AuditLogData {
  id: string;
  actorName?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  outcome: 'SUCCESS' | 'DENIED' | 'ERROR';
  createdAt: string;
}

export interface ReportPopulationData extends DashboardData {
  generatedAt: string;
  filters: Record<string, string>;
}

export type AiRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AiReportStatus = 'DRAFT' | 'REVIEWED';

export interface AiRiskReportData {
  id: string;
  athleteId: string;
  sourceParticipantId?: string | null;
  riskLevel: AiRiskLevel;
  summary: string;
  riskFactors: string[];
  protectiveFactors: string[];
  recommendations: string[];
  urgentActions: string[];
  limitations: string;
  status: AiReportStatus;
  model: string;
  generatedAt: string;
  reviewedAt?: string | null;
  version: number;
}

export interface IndividualReportData {
  athlete: AthleteRecord;
  workspace: AthleteWorkspace;
  aiReports: AiRiskReportData[];
  generatedAt: string;
}

export function matchesConfigurableRule(rule: Pick<ConfigurableRuleData, 'field' | 'operator' | 'expectedValue'>, values: Record<string, unknown>): boolean {
  const actual = values[rule.field];
  if (rule.operator === 'EQUALS') return String(actual) === rule.expectedValue;
  if (rule.operator === 'INCLUDES') return Array.isArray(actual) && actual.map(String).includes(rule.expectedValue);
  if (rule.operator === 'GREATER_THAN') return Number.isFinite(Number(actual)) && Number(actual) > Number(rule.expectedValue);
  return false;
}

export function validateScreeningResponses(
  questions: ScreeningQuestionData[],
  responses: Record<string, unknown>,
  requireComplete = true,
): string[] {
  const errors: string[] = [];
  const questionIds = new Set(questions.map((question) => question.id));
  for (const responseId of Object.keys(responses)) {
    if (!questionIds.has(responseId)) errors.push('El resultado contiene una respuesta que no pertenece al instrumento.');
  }
  for (const question of questions) {
    const value = responses[question.id];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (requireComplete && question.required) errors.push(`Falta responder: ${question.prompt}`);
      continue;
    }
    if (question.type === 'TEXT' && typeof value !== 'string') errors.push(`La respuesta de “${question.prompt}” debe ser texto.`);
    if (question.type === 'NUMBER' && (typeof value !== 'number' || !Number.isFinite(value))) errors.push(`La respuesta de “${question.prompt}” debe ser numérica.`);
    if (question.type === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(value) || value.some((option) => typeof option !== 'string' || !question.options.includes(option))) errors.push(`La respuesta de “${question.prompt}” contiene opciones inválidas.`);
    } else if (['YES_NO', 'SINGLE_CHOICE', 'SCALE'].includes(question.type) && (typeof value !== 'string' || !question.options.includes(value))) {
      errors.push(`La respuesta de “${question.prompt}” no corresponde a una opción válida.`);
    }
  }
  return errors;
}
