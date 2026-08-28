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
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    loadCampaigns().then((items) => {
      const item = items.find((current) => current.id === id);
      setCampaign(item);
      const existing = item?.participants.find((participant) => participant.athleteId === athleteId);
      if (existing) {
        setResponses(existing.responses);
        const firstUnanswered = item!.instrument.questions.findIndex((question) => existing.responses[question.id] === undefined || existing.responses[question.id] === '');
        setStep(firstUnanswered >= 0 ? firstUnanswered : 0);
      }
    });
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

  if (!campaign) return <div className="p-12 text-center text-sm text-slate-500">Abriendo instrumento…</div>;
  const currentCampaign = campaign;
  const person = currentCampaign.participants.find((participant) => participant.athleteId === athleteId);
  if (!person) return <Navigate to={`/brigadas/${id}`} replace/>;
  if (currentCampaign.status !== 'ACTIVE') return <Navigate to={`/brigadas/${id}`} replace/>;
  const question = currentCampaign.instrument.questions[step];
  if (!question) return <div className="card p-10 text-center">El instrumento no contiene preguntas activas.</div>;
  const value = responses[question.id];

  function answer(nextValue: unknown) {
    setResponses((current) => ({ ...current, [question!.id]: nextValue }));
    setDirty(true); setError(''); setSaveState('idle');
  }
  async function persistProgress(nextStep: number) {
    const currentError = validateScreeningResponses(
      [question!],
      { [question!.id]: responses[question!.id] },
      true,
    )[0];
    if (currentError) return setError(currentError);
    setSaveState('saving');
    try { await saveScreeningProgressOffline(id, athleteId, responses, 'IN_PROGRESS'); setDirty(false); setSaveState('saved'); setStep(nextStep); }
    catch (reason) { setSaveState('error'); setError(reason instanceof Error ? reason.message : 'No fue posible guardar el avance.'); }
  }
  async function finish() {
    const errors = validateScreeningResponses(currentCampaign.instrument.questions, responses, true);
    if (errors.length > 0) { setError(errors[0]!); const missing = currentCampaign.instrument.questions.findIndex((item) => errors[0]!.includes(item.prompt)); if (missing >= 0) setStep(missing); return; }
    setSaveState('saving');
    try { await saveScreeningOffline(id, athleteId, responses); setDirty(false); navigate(`/brigadas/${id}/resultados/${athleteId}`); }
    catch (reason) { setSaveState('error'); setError(reason instanceof Error ? reason.message : 'No fue posible completar el tamizaje.'); }
  }

  return <div className="mx-auto max-w-3xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to={`/brigadas/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Volver a la brigada</Link><div className="flex items-center gap-2 text-xs font-semibold text-slate-500">{!online && <><CloudOff size={15}/> Sin conexión · </>}{saveState === 'saving' ? 'Guardando avance…' : saveState === 'saved' ? 'Avance guardado en el dispositivo' : saveState === 'error' ? 'Error al guardar' : dirty ? 'Cambio pendiente' : 'Listo'}</div></div>
    <div className="mt-5"><p className="text-sm font-bold text-coral-600">{campaign.instrument.name} v{campaign.instrument.version}</p><h1 className="font-display text-4xl text-pine-900">{person.athleteName}</h1><p className="mt-2 text-sm text-slate-500">Pregunta {step + 1} de {campaign.instrument.questions.length} · {question.dimension}</p></div>
    <div className="mt-5 h-2 overflow-hidden rounded-full bg-pine-100"><div className="h-full bg-coral-500 transition-all" style={{ width: `${(step + 1) / campaign.instrument.questions.length * 100}%` }}/></div>
    {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="card mt-6 p-6 md:p-9"><h2 className="font-display text-3xl leading-tight text-pine-900">{question.prompt}</h2><div className="mt-7 grid gap-3">{question.type === 'TEXT' ? <textarea className="field py-3" rows={5} value={String(value ?? '')} onChange={(event) => answer(event.target.value)}/> : question.type === 'NUMBER' ? <input type="number" className="field" value={String(value ?? '')} onChange={(event) => answer(event.target.value === '' ? '' : Number(event.target.value))}/> : question.options.map((option) => <label key={option} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${(question.type === 'MULTIPLE_CHOICE' ? Array.isArray(value) && value.includes(option) : value === option) ? 'border-pine-500 bg-pine-50' : 'border-slate-200'}`}><input type={question.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'} name={question.id} className="h-5 w-5 accent-pine-700" checked={question.type === 'MULTIPLE_CHOICE' ? Array.isArray(value) && value.includes(option) : value === option} onChange={() => answer(question.type === 'MULTIPLE_CHOICE' ? (Array.isArray(value) && value.includes(option) ? value.filter((item) => item !== option) : [...(Array.isArray(value) ? value : []), option]) : option)}/><span className="font-medium">{option}</span></label>)}</div></section>
    <div className="mt-5 flex justify-between gap-3"><button className="btn-secondary" disabled={step === 0 || saveState === 'saving'} onClick={() => setStep(step - 1)}>Anterior</button>{step === campaign.instrument.questions.length - 1 ? <button className="btn-primary" disabled={saveState === 'saving'} onClick={() => void finish()}><Check size={18}/> Finalizar tamizaje</button> : <button className="btn-primary" disabled={saveState === 'saving'} onClick={() => void persistProgress(step + 1)}><Save size={17}/> Guardar y continuar</button>}</div>
    <p className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Este instrumento es preventivo. Sus respuestas pueden generar indicadores para valoración, pero no producen diagnósticos clínicos.</p>
  </div>;
}
