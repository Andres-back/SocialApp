import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { AthleteRecord, AthleteWorkspace, SocialRecordData, SystemInstrumentQuestionData } from '@socialapp/shared';
import { loadAthlete, loadSocialRecord } from '../features/athletes/athlete-repository';
import { configuredSystemInstrument, SYSTEM_INSTRUMENTS, type SystemInstrumentKind } from '../features/instruments/instrument-catalog';
import { loadSystemInstrumentConfigurations } from '../features/instruments/useSystemInstrument';
import { loadCampaigns, loadManageableInstruments, loadWorkspace } from '../features/work/work-repository';
import { api } from '../lib/api';

type PrintableQuestion = SystemInstrumentQuestionData & { options?: string[] };
type PrintModel = { name: string; version: number; questions: PrintableQuestion[]; answers: Record<string, unknown>; athlete?: AthleteRecord; completedAt?: string | null; status: 'blank' | 'completed' | 'not-found' };

const valueLabels: Record<string, string> = {
  MOTHER: 'Madre', FATHER: 'Padre', BOTH: 'Ambos', GRANDPARENT: 'Abuelo/a', OTHER_RELATIVE: 'Otro familiar', OTHER: 'Otro',
  VERY_GOOD: 'Muy buenas', GOOD: 'Buenas', REGULAR: 'Regulares', DIFFICULT: 'Difíciles', CLOSE: 'Cercana', ADEQUATE: 'Adecuada',
  DISTANT: 'Distante', CONFLICTIVE: 'Conflictiva', UNKNOWN: 'Sin información', FAMILY: 'Familia', FRIENDS: 'Amigos',
  COACH: 'Entrenador', SCHOOL: 'Institución educativa', PUBLIC_INSTITUTIONS: 'Instituciones públicas', COMMUNITY: 'Comunidad',
  HEALTH: 'Servicios de salud', SPORTS_ORGANIZATION: 'Organización deportiva', NONE: 'No identifica', HOUSE: 'Casa',
  APARTMENT: 'Apartamento', OWNED: 'Propia', RENTED: 'Arrendada', URBAN: 'Urbana', RURAL: 'Rural', UNSPECIFIED: 'Sin informar',
  ELECTRICITY: 'Energía eléctrica', GAS: 'Gas', SEWERAGE: 'Alcantarillado', POTABLE_WATER: 'Agua potable', INTERNET: 'Internet',
  WALKING: 'Caminando', BICYCLE: 'Bicicleta', PUBLIC_TRANSPORT: 'Transporte público', MOTORCYCLE: 'Moto',
  FAMILY_TRANSPORT: 'Transporte familiar', INSTITUTIONAL_TRANSPORT: 'Transporte institucional', UNDER_15: 'Menos de 15 min',
  FROM_15_TO_30: '15–30 min', FROM_31_TO_60: '31–60 min', OVER_60: 'Más de 60 min', NEVER: 'Nunca',
  SOMETIMES: 'Algunas veces', FREQUENTLY: 'Frecuentemente', ALWAYS: 'Siempre', RARELY: 'Rara vez',
  UNDER_1_SMMLV: 'Menos de 1 SMMLV', FROM_1_TO_2_SMMLV: 'Entre 1 y 2 SMMLV', FROM_2_TO_3_SMMLV: 'Entre 2 y 3 SMMLV',
  OVER_3_SMMLV: 'Más de 3 SMMLV', PREFER_NOT_TO_SAY: 'Prefiere no responder', GREEN: 'Verde', YELLOW: 'Amarillo',
  RED: 'Rojo', LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', SOCIAL_WORK_ONLY: 'Solo Trabajo Social',
  AUTHORIZED_TEAM: 'Equipo autorizado', INSTITUTIONAL_SUMMARY: 'Institucional resumida',
};

const optionMap: Record<string, string[]> = {
  livingWith: ['Madre', 'Padre', 'Hermanos', 'Abuelos', 'Otros familiares', 'Personas no familiares'],
  primaryCaregiver: ['Madre', 'Padre', 'Ambos', 'Abuelo/a', 'Otro familiar', 'Otro'],
  familyRelationships: ['Muy buenas', 'Buenas', 'Regulares', 'Difíciles'],
  supportNetworks: ['Familia', 'Amigos', 'Entrenador', 'Institución educativa', 'Instituciones públicas', 'Comunidad', 'Servicios de salud', 'Organización deportiva', 'No identifica', 'Otro'],
  housingType: ['Casa', 'Apartamento', 'Otro'], housingTenure: ['Propia', 'Arrendada', 'Familiar', 'Otra'],
  zone: ['Sin informar', 'Urbana', 'Rural'], utilities: ['Energía eléctrica', 'Gas', 'Alcantarillado', 'Agua potable', 'Internet'],
  exclusiveKitchen: ['Sí', 'No'], transportMode: ['Caminando', 'Bicicleta', 'Transporte público', 'Moto', 'Transporte familiar', 'Transporte institucional', 'Otro'],
  travelTime: ['Menos de 15 min', '15–30 min', '31–60 min', 'Más de 60 min'], transportDifficulty: ['Nunca', 'Algunas veces', 'Frecuentemente'],
  foodReduction: ['No', 'Algunas veces', 'Frecuentemente'], foodBeforeTraining: ['Siempre', 'Algunas veces', 'Rara vez', 'Nunca'],
  incomeRange: ['Menos de 1 SMMLV', 'Entre 1 y 2 SMMLV', 'Entre 2 y 3 SMMLV', 'Más de 3 SMMLV', 'Prefiere no responder'],
  level: ['Verde', 'Amarillo', 'Rojo'], priority: ['Baja', 'Media', 'Alta'],
  visibility: ['Solo Trabajo Social', 'Equipo autorizado', 'Institucional resumida'],
  relationship: ['Cercana / Fuerte', 'Adecuada / Moderada', 'Distante / Débil', 'Conflictiva'],
};

function formatInstrumentAnswer(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object' && item ? Object.entries(item as Record<string, unknown>).map(([key, current]) => key === 'id' ? '' : formatInstrumentAnswer(current)).filter(Boolean).join(' · ') : formatInstrumentAnswer(item)).filter(Boolean).join('; ');
  return valueLabels[String(value)] ?? String(value);
}

function systemAnswers(kind: SystemInstrumentKind, social: SocialRecordData | null, workspace: AthleteWorkspace) {
  if (kind === 'social-record' && social) return { answers: social as unknown as Record<string, unknown>, completedAt: social.completedAt, found: true };
  if (kind === 'socioeconomic-assessment' && workspace.socioeconomicAssessment) return { answers: workspace.socioeconomicAssessment as unknown as Record<string, unknown>, completedAt: workspace.socioeconomicAssessment.completedAt, found: true };
  if (kind === 'alert-assessment') {
    const item = [...workspace.alerts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return { answers: item ? item as unknown as Record<string, unknown> : {}, completedAt: item?.updatedAt, found: Boolean(item) };
  }
  if (kind === 'social-follow-up') {
    const item = [...workspace.followUps].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const entry = item?.entries?.[0];
    return { answers: item ? { ...item, ...entry, nextDate: entry?.estimatedDate } : {}, completedAt: item?.updatedAt, found: Boolean(item) };
  }
  if (kind === 'professional-observation') {
    const item = [...workspace.observations].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return { answers: item ? item as unknown as Record<string, unknown> : {}, completedAt: item?.createdAt, found: Boolean(item) };
  }
  const diagram = kind === 'genogram' ? workspace.genogram : workspace.ecomap;
  return { answers: diagram ? { nodeLabel: diagram.nodes.filter((item) => item.id !== 'athlete').map((item) => item.label), relationship: diagram.edges.map((item) => item.relation) } : {}, completedAt: diagram?.updatedAt, found: Boolean(diagram) };
}

export function InstrumentPrintPage() {
  const { source = '', instrumentId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const athleteId = searchParams.get('athleteId') ?? '';
  const [model, setModel] = useState<PrintModel>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (async () => {
      const athlete = athleteId ? await loadAthlete(athleteId) : undefined;
      if (source === 'system') {
        const definition = SYSTEM_INSTRUMENTS.find((item) => item.kind === instrumentId);
        if (!definition) throw new Error('El instrumento institucional no existe.');
        const configured = configuredSystemInstrument(definition, await loadSystemInstrumentConfigurations(true));
        let result = { answers: {} as Record<string, unknown>, completedAt: undefined as string | null | undefined, found: false };
        if (athleteId) {
          const [social, workspace] = await Promise.all([loadSocialRecord(athleteId), loadWorkspace(athleteId)]);
          result = systemAnswers(configured.kind, social, workspace);
        }
        if (active) setModel({ name: configured.name, version: configured.version, questions: configured.questions.map((item) => ({ ...item, options: optionMap[item.id] })), answers: result.answers, athlete, completedAt: result.completedAt, status: athleteId ? result.found ? 'completed' : 'not-found' : 'blank' });
        return;
      }
      const instrument = (await loadManageableInstruments()).find((item) => item.id === instrumentId);
      if (!instrument) throw new Error('El cuestionario ya no está disponible.');
      let answers: Record<string, unknown> = {};
      let completedAt: string | null | undefined;
      let found = false;
      if (athleteId) {
        const matches = (await loadCampaigns()).flatMap((campaign) => campaign.instrumentId === instrumentId ? campaign.participants.filter((item) => item.athleteId === athleteId).map((item) => ({ ...item, campaignDate: campaign.date })) : []);
        const latest = matches.sort((a, b) => (b.completedAt ?? b.campaignDate).localeCompare(a.completedAt ?? a.campaignDate))[0];
        if (latest) { answers = latest.responses; completedAt = latest.completedAt; found = Object.keys(latest.responses).length > 0; }
      }
      if (active) setModel({ name: instrument.name, version: instrument.version, questions: instrument.questions, answers, athlete, completedAt, status: athleteId ? found ? 'completed' : 'not-found' : 'blank' });
    })().catch((reason) => active && setError(reason instanceof Error ? reason.message : 'No fue posible preparar la impresión.'));
    return () => { active = false; };
  }, [athleteId, instrumentId, source]);

  const generatedAt = useMemo(() => new Date().toLocaleString('es-CO'), []);
  async function print() {
    await api.auditExport(model?.status === 'completed' ? 'CompletedInstrument' : 'BlankInstrument', athleteId || undefined).catch(() => undefined);
    window.print();
  }
  if (!model) return <div className="p-12 text-center text-sm text-slate-500">{error || 'Preparando formato imprimible…'}</div>;
  return <div className="mx-auto max-w-4xl bg-white p-5 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link to={athleteId ? '/instrumentos?athleteId=' + athleteId : '/instrumentos'} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Volver a instrumentos</Link><button className="btn-primary" onClick={() => void print()}><Printer size={18}/> Imprimir / Guardar PDF</button></div>
    <header className="mt-6 border-b-2 border-pine-800 pb-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral-600">Programa de Trabajo Social · Instrumento {model.status === 'blank' ? 'en blanco' : 'diligenciado'}</p><h1 className="mt-2 font-display text-4xl text-pine-900">{model.name}</h1><p className="mt-2 text-sm text-slate-500">Versión {model.version}{model.completedAt ? ' · Diligenciado: ' + new Date(model.completedAt).toLocaleString('es-CO') : ''}</p></header>
    <section className="mt-5 grid gap-3 border-b border-slate-200 pb-5 sm:grid-cols-2">
      <Info label="Deportista" value={model.athlete ? model.athlete.firstNames + ' ' + model.athlete.lastNames : '________________________________'} />
      <Info label="Código" value={model.athlete?.internalCode || '________________________________'} />
      <Info label="Fecha de aplicación" value={model.completedAt ? new Date(model.completedAt).toLocaleDateString('es-CO') : '____ / ____ / ________'} />
      <Info label="Profesional" value="________________________________" />
    </section>
    {model.status === 'not-found' && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 print:hidden">No encontramos respuestas diligenciadas para este deportista. Se muestra el formato en blanco con sus datos de identificación.</div>}
    <div className="mt-6 space-y-5">{model.questions.map((question, index) => {
      const answer = formatInstrumentAnswer(model.answers[question.id]);
      return <section key={question.id} className="break-inside-avoid rounded-xl border border-slate-300 p-4"><p className="text-xs font-bold uppercase tracking-wide text-coral-600">Pregunta {index + 1}</p><h2 className="mt-2 text-base font-semibold leading-6 text-pine-900">{question.prompt}</h2>{answer ? <div className="mt-3 min-h-12 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700"><strong>Respuesta:</strong> {answer}</div> : question.options?.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option) => <span key={option} className="text-sm text-slate-700">☐ {option}</span>)}</div> : <div className="mt-5 space-y-5" aria-label="Espacio para respuesta"><div className="border-b border-slate-400"/><div className="border-b border-slate-400"/><div className="border-b border-slate-400"/></div>}</section>;
    })}</div>
    <section className="mt-7 break-inside-avoid grid gap-8 border-t border-slate-300 pt-12 sm:grid-cols-2"><div className="border-t border-slate-500 pt-2 text-center text-xs text-slate-500">Firma del profesional</div><div className="border-t border-slate-500 pt-2 text-center text-xs text-slate-500">Firma del deportista o acudiente</div></section>
    <footer className="mt-8 border-t pt-3 text-xs text-slate-400">Formato generado el {generatedAt}. Documento de apoyo para Trabajo Social.</footer>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div>;
}
