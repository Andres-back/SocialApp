import type { AiRiskReportData, AlertData, AppFeatureKey, AthleteInput, AthleteRecord, AthleteWorkspace, AuthSession, CampaignAiReportData, DashboardData, FeatureVisibilityData, FollowUpCaseData, FollowUpCaseInput, FollowUpEntryData, FollowUpEntryInput, ManageableSportsCatalogs, NetworkDiagramData, ProfessionalObservationData, ReportPopulationData, ScreeningCampaignData, ScreeningCampaignInput, ScreeningInstrumentData, ScreeningInstrumentInput, SocialRecordData, SocialRecordInput, SocioeconomicAssessmentData, SocioeconomicAssessmentInput, SportsCatalogs, SyncMutation, SyncPushResponse, SystemInstrumentConfigurationData, SystemInstrumentQuestionData } from '@socialapp/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
let accessToken: string | null = sessionStorage.getItem('socialapp.accessToken');
let activeRefresh: Promise<AuthSession | null> | null = null;

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) sessionStorage.setItem('socialapp.accessToken', token);
  else sessionStorage.removeItem('socialapp.accessToken');
}

async function refreshSession(): Promise<AuthSession | null> {
  if (!activeRefresh) {
    activeRefresh = (async () => {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.status === 204) {
        setAccessToken(null);
        return null;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new ApiRequestError(body?.message ?? 'No fue posible renovar la sesión.', response.status);
      }
      const session = await response.json() as AuthSession;
      setAccessToken(session.accessToken);
      return session;
    })().finally(() => { activeRefresh = null; });
  }
  return activeRefresh;
}

async function request<T>(path: string, init: RequestInit = {}, retryAfterRefresh = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (response.status === 401 && retryAfterRefresh && path !== '/auth/refresh') {
    const session = await refreshSession().catch(() => null);
    if (session) return request<T>(path, init, false);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiRequestError(body?.message ?? 'No fue posible completar la solicitud.', response.status);
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  refresh() {
    return refreshSession();
  },
  logout() {
    return request<{ success: boolean }>('/auth/logout', { method: 'POST' });
  },
  health() {
    return request<{ status: string }>('/health');
  },
  pushMutations(mutations: SyncMutation[]) {
    return request<SyncPushResponse>('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ mutations }),
    });
  },
  listAthletes(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<AthleteRecord[]>(`/athletes${query}`);
  },
  getAthlete(id: string) {
    return request<AthleteRecord>(`/athletes/${id}`);
  },
  saveAthlete(input: AthleteInput) {
    return request<AthleteRecord>('/athletes', { method: 'POST', body: JSON.stringify(input) });
  },
  deleteAthlete(id: string) {
    return request<{ success: boolean }>(`/athletes/${id}`, { method: 'DELETE' });
  },
  getSportsCatalogs() {
    return request<SportsCatalogs>('/catalogs/sports');
  },
  getSocialRecord(athleteId: string) {
    return request<SocialRecordData | null>(`/athletes/${athleteId}/social-record`);
  },
  saveSocialRecord(input: SocialRecordInput) {
    return request<SocialRecordData>(`/athletes/${input.athleteId}/social-record`, { method: 'PUT', body: JSON.stringify(input) });
  },
  getWorkspace(athleteId: string) {
    return request<AthleteWorkspace>(`/athletes/${athleteId}/workspace`);
  },
  saveAssessment(input: SocioeconomicAssessmentInput) {
    return request<SocioeconomicAssessmentData>(`/athletes/${input.athleteId}/socioeconomic-assessment`, { method: 'PUT', body: JSON.stringify(input) });
  },
  saveAlert(input: AlertData) {
    return request<AlertData>(`/athletes/${input.athleteId}/alerts`, { method: 'POST', body: JSON.stringify(input) });
  },
  updateAlert(input: AlertData) {
    return request<AlertData>(`/alerts/${input.id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  saveFollowUp(input: FollowUpCaseInput) {
    return request<FollowUpCaseData>(`/athletes/${input.athleteId}/follow-ups`, { method: 'POST', body: JSON.stringify(input) });
  },
  updateFollowUp(input: FollowUpCaseInput) {
    return request<FollowUpCaseData>(`/follow-ups/${input.id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  saveFollowUpEntry(input: FollowUpEntryInput) {
    return request<FollowUpEntryData>(`/follow-ups/${input.followUpCaseId}/entries`, { method: 'POST', body: JSON.stringify(input) });
  },
  saveObservation(input: ProfessionalObservationData) {
    return request<ProfessionalObservationData>(`/athletes/${input.athleteId}/observations`, { method: 'POST', body: JSON.stringify(input) });
  },
  saveDiagram(type: 'genogram' | 'ecomap', input: NetworkDiagramData) {
    return request<NetworkDiagramData>(`/athletes/${input.athleteId}/${type}`, { method: 'PUT', body: JSON.stringify(input) });
  },
  listInstruments() { return request<ScreeningInstrumentData[]>('/campaigns/instruments'); },
  manageableInstruments() { return request<ScreeningInstrumentData[]>('/instruments/manage'); },
  systemInstruments() { return request<SystemInstrumentConfigurationData[]>('/instruments/system'); },
  saveSystemInstrument(kind: string, questions: SystemInstrumentQuestionData[]) { return request<SystemInstrumentConfigurationData>('/instruments/system/' + kind, { method: 'PUT', body: JSON.stringify({ questions }) }); },
  saveOperationalInstrument(input: ScreeningInstrumentInput) { return request<ScreeningInstrumentData>('/instruments', { method: 'POST', body: JSON.stringify(input) }); },
  updateInstrumentStatus(id: string, active: boolean) { return request<ScreeningInstrumentData>(`/instruments/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }); },
  deleteInstrument(id: string) { return request<{ success: boolean; deletedVersions: number }>(`/instruments/${id}`, { method: 'DELETE' }); },
  listCampaigns() { return request<ScreeningCampaignData[]>('/campaigns'); },
  getCampaign(id: string) { return request<ScreeningCampaignData>(`/campaigns/${id}`); },
  saveCampaign(input: ScreeningCampaignInput) { return request<ScreeningCampaignData>('/campaigns', { method: 'POST', body: JSON.stringify(input) }); },
  deleteCampaign(id: string) { return request<{ success: boolean }>(`/campaigns/${id}`, { method: 'DELETE' }); },
  saveScreeningResult(campaignId: string, athleteId: string, input: Record<string, unknown>) {
    return request(`/campaigns/${campaignId}/participants/${athleteId}`, { method: 'PUT', body: JSON.stringify(input) });
  },
  dashboard() { return request<DashboardData>('/dashboard'); },
  populationReport(filters: Record<string, string> = {}) {
    const query = new URLSearchParams(filters).toString();
    return request<ReportPopulationData>(`/reports/population${query ? `?${query}` : ''}`);
  },
  individualReport(athleteId: string) { return request(`/reports/athletes/${athleteId}`); },
  listAiRiskReports(athleteId: string) { return request<AiRiskReportData[]>(`/athletes/${athleteId}/ai-reports`); },
  generateAiRiskReport(athleteId: string, participantId?: string) {
    return request<AiRiskReportData>(`/athletes/${athleteId}/ai-reports`, { method: 'POST', body: JSON.stringify({ participantId }) });
  },
  listCampaignAiReports(campaignId: string) { return request<CampaignAiReportData[]>(`/campaigns/${campaignId}/ai-reports`); },
  generateCampaignAiReport(campaignId: string) { return request<CampaignAiReportData>(`/campaigns/${campaignId}/ai-reports`, { method: 'POST' }); },
  reviewAiRiskReport(id: string) { return request<AiRiskReportData>(`/ai-reports/${id}/review`, { method: 'PATCH' }); },
  auditExport(type: string, athleteId?: string) { return request<{ success: boolean }>('/reports/export-audit', { method: 'POST', body: JSON.stringify({ type, athleteId }) }); },
  adminOverview() { return request<Record<string, unknown>>('/admin/overview'); },
  featureVisibility() { return request<FeatureVisibilityData[]>('/features'); },
  updateFeatureVisibility(key: AppFeatureKey, enabledForSocialWorker: boolean) { return request<FeatureVisibilityData>('/admin/features/' + key, { method: 'PUT', body: JSON.stringify({ enabledForSocialWorker }) }); },
  createCatalog(kind: string, name: string) { return request(`/admin/catalogs/${kind}`, { method: 'POST', body: JSON.stringify({ name }) }); },
  manageableCatalogs() { return request<ManageableSportsCatalogs>('/catalogs/manage'); },
  createOperationalCatalog(kind: string, name: string) { return request(`/catalogs/${kind}`, { method: 'POST', body: JSON.stringify({ name }) }); },
  updateOperationalCatalog(kind: string, id: string, body: { name?: string; active?: boolean }) { return request(`/catalogs/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); },
  saveRule(body: Record<string, unknown>) { return request('/admin/rules', { method: 'POST', body: JSON.stringify(body) }); },
  saveInstrument(body: Record<string, unknown>) { return request('/admin/instruments', { method: 'POST', body: JSON.stringify(body) }); },
  createUser(body: Record<string, unknown>) { return request('/admin/users', { method: 'POST', body: JSON.stringify(body) }); },
  updateUserStatus(id: string, status: string) { return request(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
};
