import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiReportsService } from './ai-reports.service';

describe('AiReportsService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GROQ_API_KEY;
  });

  it('envía un expediente seudonimizado y guarda el borrador', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const athlete = {
      id: '11111111-1111-1111-1111-111111111111',
      firstNames: 'Nombre sensible',
      lastNames: 'Apellido sensible',
      documentNumber: '123456789',
      birthDate: new Date('2014-01-01'),
      sex: 'FEMALE',
      currentlyEnrolled: true,
      schoolGrade: '6',
      schoolShift: 'Mañana',
      sport: { name: 'Voleibol' },
      sportsProgram: { name: 'Formación' },
      socialRecords: [],
      socioeconomicAssessments: [],
      alerts: [],
      followUpCases: [],
      observations: [],
      campaignParticipants: [],
    };
    const saved = {
      id: '22222222-2222-2222-2222-222222222222',
      athleteId: athlete.id,
      sourceParticipantId: null,
      riskLevel: 'LOW',
      summary: 'Sin indicadores suficientes.',
      riskFactors: [],
      protectiveFactors: ['Vinculación deportiva'],
      recommendations: ['Completar ficha social'],
      urgentActions: [],
      limitations: 'Información incompleta.',
      status: 'DRAFT',
      model: 'openai/gpt-oss-20b',
      generatedAt: new Date(),
      reviewedAt: null,
      version: 1,
    };
    const prisma = {
      athlete: { findFirst: vi.fn().mockResolvedValue(athlete) },
      aiRiskReport: { create: vi.fn().mockResolvedValue(saved) },
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        riskLevel: saved.riskLevel,
        summary: saved.summary,
        riskFactors: saved.riskFactors,
        protectiveFactors: saved.protectiveFactors,
        recommendations: saved.recommendations,
        urgentActions: saved.urgentActions,
        limitations: saved.limitations,
      }) } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AiReportsService(prisma as never, audit as never);
    const result = await service.generate('33333333-3333-3333-3333-333333333333', athlete.id);

    const request = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as { messages: Array<{ content: string }> };
    const payload = request.messages[1]!.content;
    expect(payload).not.toContain(athlete.firstNames);
    expect(payload).not.toContain(athlete.lastNames);
    expect(payload).not.toContain(athlete.documentNumber);
    expect(payload).toContain('Voleibol');
    expect(result.status).toBe('DRAFT');
    expect(prisma.aiRiskReport.create).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('genera el informe de brigada sin enviar respuestas individuales ni textos libres', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const campaignId = '11111111-1111-1111-1111-111111111111';
    const participants = Array.from({ length: 1 }, (_, index) => ({
      responses: { choice: 'Sí', note: 'texto-sensible-' + index, amount: 987650 + index },
      completedAt: new Date(),
    }));
    const campaign = {
      id: campaignId,
      instrument: { name: 'Tamizaje', version: 1, questions: [
        { id: 'choice', dimension: 'General', prompt: '¿Cuenta con apoyo?', type: 'YES_NO' },
        { id: 'note', dimension: 'General', prompt: 'Observación libre', type: 'TEXT' },
        { id: 'amount', dimension: 'General', prompt: 'Valor informado', type: 'NUMBER' },
      ] },
      participants,
    };
    const saved = { id: '22222222-2222-2222-2222-222222222222', campaignId, generalResults: 'La respuesta disponible fue afirmativa.', observations: ['Cobertura disponible.'], recommendations: ['Revisar el resultado con el equipo.'], limitations: 'Solo hay una encuesta completada y no se analizaron textos libres.', model: 'openai/gpt-oss-20b', generatedAt: new Date(), version: 1 };
    const prisma = {
      screeningCampaign: { findFirst: vi.fn().mockResolvedValue(campaign) },
      campaignParticipant: { count: vi.fn().mockResolvedValue(1) },
      campaignAiReport: { create: vi.fn().mockResolvedValue(saved) },
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ generalResults: saved.generalResults, observations: saved.observations, recommendations: saved.recommendations, limitations: saved.limitations }) } }] }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await new AiReportsService(prisma as never, audit as never).generateCampaignReport('33333333-3333-3333-3333-333333333333', campaignId);

    const request = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as { messages: Array<{ content: string }> };
    const payload = request.messages[1]!.content;
    expect(payload).toContain('"option":"Sí","count":1');
    expect(payload).not.toContain('texto-sensible');
    expect(payload).not.toContain('98765');
    expect(result.generalResults).toBe(saved.generalResults);
    expect(prisma.campaignAiReport.create).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ source: 'aggregate-only' }) }));
  });
});
