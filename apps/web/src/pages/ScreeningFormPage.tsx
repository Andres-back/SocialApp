import { ArrowLeft, Check, CloudOff, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { validateScreeningResponses, type ScreeningCampaignData } from '@socialapp/shared';
import { loadCampaigns, saveScreeningOffline, saveScreeningProgressOffline } from '../features/work/work-repository';
import { useConnection } from '../hooks/useConnection';

export function ScreeningFormPage() {
  const { id = '', athleteId = '' } = useParams();
  const navigate = useNavigate();
  const online = useConnection();
  const [campaign, setCampaign] = useState<ScreeningCampaignData>();
  const [loaded, setLoaded] = useState(false);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoaded(false);
    loadCampaigns().then((items) => {
      const item = items.find((current) => current.id === id);
      setCampaign(item);
      const existing = item?.participants.find((participant) => participant.athleteId === athleteId);
      if (existing) {
        setResponses(existing.responses);
      }
    }).finally(() => setLoaded(true));
  }, [id, athleteId]);

  useEffect(() => {
    if (!dirty || !campaign) return;
    const timer = window.setTimeout(() => {
      setSaveState('saving');
      saveScreeningProgressOffline(id, athleteId, responses, 'IN_PROGRESS')
        .then(() => { setDirty(false); setSaveState('saved'); })
        .catch(() => setSaveState('error'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [athleteId, campaign, dirty, id, responses]);

  if (!campaign) return loaded
    ? <div className="card p-10 text-center"><h1 className="font-display text-3xl text-pine-900">La brigada ya no está disponible</h1><p className="mt-2 text-sm text-slate-500">No se enviaron más cambios. La información local pendiente permanece protegida en Sincronización.</p><Link to="/brigadas" className="btn-primary mt-6">Volver a brigadas</Link></div>
    : <div className="p-12 text-center text-sm text-slate-500">Abriendo instrumento…</div>;
  const currentCampaign = campaign;
  const person = currentCampaign.participants.find((participant) => participant.athleteId === athleteId);
  if (!person) return <Navigate to={`/brigadas/${id}`} replace/>;
  if (currentCampaign.status !== 'ACTIVE') return <Navigate to={`/brigadas/${id}`} replace/>;
  const questions = currentCampaign.instrument.questions;
  if (questions.length === 0) return <div className="card p-10 text-center">El instrumento no contiene preguntas activas.</div>;
  const answeredCount = questions.filter((question) => hasResponse(responses[question.id])).length;

  function answer(questionId: string, nextValue: unknown) {
    setResponses((current) => ({ ...current, [questionId]: nextValue }));
    setDirty(true); setError(''); setSaveState('idle');
  }
  async function finish() {
    const errors = validateScreeningResponses(questions, responses, true);
    if (errors.length > 0) {
      setError(errors[0]!);
      const missing = questions.find((item) => errors[0]!.includes(item.prompt));
      if (missing) window.requestAnimationFrame(() => document.getElementById(`pregunta-${missing.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setDirty(false);
    setSaveState('saving');
    try { await saveScreeningOffline(id, athleteId, responses); setDirty(false); navigate(`/brigadas/${id}/resultados/${athleteId}`); }
    catch (reason) { setDirty(true); setSaveState('error'); setError(reason instanceof Error ? reason.message : 'No fue posible completar el tamizaje.'); }
  }

  return <div className="mx-auto max-w-4xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to={`/brigadas/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Volver a la brigada</Link><div className="flex items-center gap-2 text-xs font-semibold text-slate-500">{!online && <><CloudOff size={15}/> Sin conexión · </>}{saveState === 'saving' ? 'Guardando avance…' : saveState === 'saved' ? 'Avance guardado en el dispositivo' : saveState === 'error' ? 'Error al guardar' : dirty ? 'Cambio pendiente' : 'Listo'}</div></div>
    <div className="mt-5"><p className="text-sm font-bold text-coral-600">{campaign.instrument.name} v{campaign.instrument.version}</p><h1 className="font-display text-4xl text-pine-900">{person.athleteName}</h1><p className="mt-2 text-sm text-slate-500">Todas las preguntas están en esta página · {answeredCount} de {questions.length} respondidas</p></div>
    <div className="mt-5 h-2 overflow-hidden rounded-full bg-pine-100"><div className="h-full bg-coral-500 transition-all" style={{ width: `${answeredCount / questions.length * 100}%` }}/></div>
    {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="mt-6 space-y-5">{questions.map((question, index) => {
      const value = responses[question.id];
      return <fieldset id={`pregunta-${question.id}`} key={question.id} className="card scroll-mt-24 p-5 md:p-7">
        <legend className="sr-only">Pregunta {index + 1}: {question.prompt}</legend>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-coral-50 px-3 py-1 text-xs font-bold text-coral-700">{index + 1}</span><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{question.dimension}</span>{question.required && <span className="text-xs font-semibold text-red-600">Obligatoria</span>}</div>
        <h2 className="mt-3 font-display text-2xl leading-tight text-pine-900">{question.prompt}</h2>
        <div className="mt-5 grid gap-3">{question.type === 'TEXT' ? <textarea aria-label={question.prompt} className="field py-3" rows={4} value={String(value ?? '')} onChange={(event) => answer(question.id, event.target.value)}/> : question.type === 'NUMBER' ? <input aria-label={question.prompt} type="number" className="field" value={String(value ?? '')} onChange={(event) => answer(question.id, event.target.value === '' ? '' : Number(event.target.value))}/> : question.options.map((option) => <label key={option} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${(question.type === 'MULTIPLE_CHOICE' ? Array.isArray(value) && value.includes(option) : value === option) ? 'border-pine-500 bg-pine-50' : 'border-slate-200 hover:border-pine-300'}`}><input type={question.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'} name={question.id} className="h-5 w-5 accent-pine-700" checked={question.type === 'MULTIPLE_CHOICE' ? Array.isArray(value) && value.includes(option) : value === option} onChange={() => answer(question.id, question.type === 'MULTIPLE_CHOICE' ? (Array.isArray(value) && value.includes(option) ? value.filter((item) => item !== option) : [...(Array.isArray(value) ? value : []), option]) : option)}/><span className="font-medium">{option}</span></label>)}</div>
      </fieldset>;
    })}</div>
    <div className="sticky bottom-4 mt-6 flex flex-col gap-3 rounded-2xl border border-pine-100 bg-white/95 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Save size={15}/> El avance se guarda automáticamente</p><button className="btn-primary" disabled={saveState === 'saving'} onClick={() => void finish()}><Check size={18}/> Finalizar tamizaje</button></div>
    <p className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Este instrumento es preventivo. Sus respuestas pueden generar indicadores para valoración, pero no producen diagnósticos clínicos.</p>
  </div>;
}

function hasResponse(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== '';
}
