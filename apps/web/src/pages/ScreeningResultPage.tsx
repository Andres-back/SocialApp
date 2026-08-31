import { ArrowLeft, CheckCircle2, Printer, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PERMISSIONS, type AiRiskReportData, type ScreeningCampaignData } from '@socialapp/shared';
import { useAuth } from '../features/auth/useAuth';
import { loadCampaigns } from '../features/work/work-repository';
import { api } from '../lib/api';

function formatAnswer(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === undefined || value === null || value === '') return 'Sin respuesta';
  return String(value);
}

export function ScreeningResultPage() {
  const { can } = useAuth();
  const { id = '', athleteId = '' } = useParams();
  const [campaign, setCampaign] = useState<ScreeningCampaignData>();
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<AiRiskReportData>();
  const [error, setError] = useState('');
  useEffect(() => { setLoaded(false); loadCampaigns().then((items) => setCampaign(items.find((item) => item.id === id))).finally(() => setLoaded(true)); }, [id]);
  const participant = campaign?.participants.find((item) => item.athleteId === athleteId);
  if (!campaign || !participant) return loaded
    ? <div className="card p-10 text-center"><h1 className="font-display text-3xl text-pine-900">Resultado no disponible</h1><p className="mt-2 text-sm text-slate-500">La brigada fue eliminada o el deportista ya no pertenece a ella.</p><Link to="/brigadas" className="btn-primary mt-6">Volver a brigadas</Link></div>
    : <div className="p-12 text-center text-sm text-slate-500">Consultando resultado…</div>;
  async function generateRiskReport() {
    setGenerating(true); setError('');
    try { setGenerated(await api.generateAiRiskReport(athleteId, participant!.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible generar el análisis.'); }
    finally { setGenerating(false); }
  }
  return <div className="mx-auto max-w-4xl">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link to={`/brigadas/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Volver a la brigada</Link><div className="flex flex-wrap gap-2">{can(PERMISSIONS.SOCIAL_RECORD_WRITE)&&<button className="btn-secondary" disabled={generating} onClick={()=>void generateRiskReport()}><Sparkles size={17}/>{generating?'Analizando…':'Analizar riesgo'}</button>}<button className="btn-secondary" onClick={() => window.print()}><Printer size={17}/> Imprimir resultado</button></div></div>
    {error&&<div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {generated&&<div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>Informe borrador generado con riesgo {generated.riskLevel==='LOW'?'bajo':generated.riskLevel==='MEDIUM'?'medio':generated.riskLevel==='HIGH'?'alto':'crítico'}.</span><Link className="font-bold underline" to={`/reportes/deportistas/${athleteId}`}>Revisar informe</Link></div>}
    <header className="mt-5 rounded-3xl bg-pine-800 p-6 text-white md:p-8"><div className="flex items-center gap-3 text-emerald-200"><CheckCircle2 size={21}/><span className="text-sm font-semibold">Tamizaje completado</span></div><h1 className="mt-3 font-display text-4xl">{participant.athleteName}</h1><p className="mt-2 text-sm text-pine-100">{campaign.instrument.name} v{campaign.instrument.version} · {campaign.name}</p><p className="mt-1 text-xs text-pine-200">Finalizado: {participant.completedAt ? new Date(participant.completedAt).toLocaleString('es-CO') : 'fecha no disponible'}</p></header>
    <div className="mt-6 space-y-4">{campaign.instrument.questions.map((question, index) => <article key={question.id} className="card p-5 md:p-6"><p className="text-xs font-bold uppercase tracking-wide text-coral-600">{index + 1}. {question.dimension}</p><h2 className="mt-2 font-semibold text-pine-900">{question.prompt}</h2><p className="mt-4 rounded-xl bg-sand-50 px-4 py-3 text-sm text-slate-700">{formatAnswer(participant.responses[question.id])}</p></article>)}</div>
    <p className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Resultado preventivo. Las respuestas y los indicadores automáticos no constituyen un diagnóstico; cualquier conclusión corresponde a la valoración profesional de Trabajo Social.</p>
  </div>;
}
