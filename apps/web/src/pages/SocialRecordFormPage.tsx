import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Plus, Save, Trash2, WifiOff } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import type { AthleteRecord, SocialRecordInput } from '@socialapp/shared';
import { loadAthlete, loadSocialRecord, saveSocialRecordOffline } from '../features/athletes/athlete-repository';
import { useAuth } from '../features/auth/useAuth';
import { useConnection } from '../hooks/useConnection';
import { db } from '../lib/db';
import { createId } from '../lib/uuid';

const memberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, 'Escribe el nombre.').max(160),
  relationship: z.string().trim().min(2, 'Indica el parentesco.').max(80),
  approximateAge: z.number().int().min(0).max(120).nullable().optional(),
  livesWithAthlete: z.boolean(),
  occupation: z.string().max(120).optional(),
  relationshipQuality: z.enum(['CLOSE', 'ADEQUATE', 'DISTANT', 'CONFLICTIVE', 'UNKNOWN']),
});
const schema = z.object({
  livingWith: z.array(z.string()).min(1, 'Selecciona al menos una opción.'),
  householdMembers: z.array(memberSchema).max(30),
  primaryCaregiver: z.enum(['MOTHER', 'FATHER', 'BOTH', 'GRANDPARENT', 'OTHER_RELATIVE', 'OTHER']),
  otherCaregiver: z.string().max(120).optional(),
  familyRelationships: z.enum(['VERY_GOOD', 'GOOD', 'REGULAR', 'DIFFICULT']),
  supportNetworks: z.array(z.string()).min(1, 'Selecciona al menos una red o “No identifica”.'),
  otherSupportNetwork: z.string().max(160).optional(),
  professionalObservation: z.string().max(4000).optional(),
});
type FormValues = z.infer<typeof schema>;

const livingOptions = [
  ['MOTHER', 'Madre'], ['FATHER', 'Padre'], ['SIBLINGS', 'Hermanos'], ['GRANDPARENTS', 'Abuelos'],
  ['OTHER_RELATIVES', 'Otros familiares'], ['NON_RELATIVES', 'Personas no familiares'],
] as const;
const networkOptions = [
  ['FAMILY', 'Familia'], ['FRIENDS', 'Amigos'], ['COACH', 'Entrenador'], ['SCHOOL', 'Institución educativa'],
  ['PUBLIC_INSTITUTIONS', 'Instituciones públicas'], ['COMMUNITY', 'Comunidad'], ['HEALTH', 'Servicios de salud'],
  ['SPORTS_ORGANIZATION', 'Organización deportiva'], ['NONE', 'No identifica red de apoyo'], ['OTHER', 'Otro'],
] as const;
const defaults: FormValues = {
  livingWith: [], householdMembers: [], primaryCaregiver: 'MOTHER', otherCaregiver: '',
  familyRelationships: 'GOOD', supportNetworks: [], otherSupportNetwork: '', professionalObservation: '',
};

export function SocialRecordFormPage() {
  const { id: athleteId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const online = useConnection();
  const [athlete, setAthlete] = useState<AthleteRecord>();
  const [recordId, setRecordId] = useState<string>(() => createId());
  const [recordVersion, setRecordVersion] = useState(0);
  const [step, setStep] = useState(1);
  const [ready, setReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('Guardado automático activo');
  const draftTimer = useRef<number | null>(null);
  const draftId = `social-record:${athleteId}`;
  const { register, control, handleSubmit, reset, watch, trigger, getValues, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control, name: 'householdMembers' });

  useEffect(() => {
    Promise.all([loadAthlete(athleteId), loadSocialRecord(athleteId), db.drafts.get(draftId)]).then(([athleteData, record, draft]) => {
      if (athleteData) setAthlete(athleteData);
      if (draft?.data) {
        reset(draft.data as FormValues);
        setDraftStatus('Borrador recuperado');
      } else if (record) {
        setRecordId(record.id);
        setRecordVersion(record.version);
        reset({
          livingWith: record.livingWith,
          householdMembers: record.householdMembers.map((member) => ({ ...member, occupation: member.occupation ?? '' })),
          primaryCaregiver: record.primaryCaregiver,
          otherCaregiver: record.otherCaregiver ?? '',
          familyRelationships: record.familyRelationships,
          supportNetworks: record.supportNetworks,
          otherSupportNetwork: record.otherSupportNetwork ?? '',
          professionalObservation: record.professionalObservation ?? '',
        });
      }
      setReady(true);
    });
  }, [athleteId, draftId, reset]);

  useEffect(() => {
    if (!ready || !user) return;
    const subscription = watch((values) => {
      setDraftStatus('Guardando…');
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
      draftTimer.current = window.setTimeout(() => {
        db.drafts.put({ id: draftId, formType: 'social-record', subjectId: athleteId, data: values, updatedAt: new Date().toISOString(), createdBy: user.id })
          .then(() => setDraftStatus('Guardado en este dispositivo'));
      }, 700);
    });
    return () => { subscription.unsubscribe(); if (draftTimer.current) window.clearTimeout(draftTimer.current); };
  }, [athleteId, draftId, ready, user, watch]);

  async function next() {
    const fieldsForStep: (keyof FormValues)[] = step === 1 ? ['livingWith', 'householdMembers'] : ['primaryCaregiver', 'familyRelationships'];
    if (await trigger(fieldsForStep)) setStep((value) => Math.min(3, value + 1));
  }

  async function complete(values: FormValues) {
    const input: SocialRecordInput = {
      id: recordId,
      athleteId,
      instrumentVersion: 1,
      status: 'COMPLETED',
      livingWith: values.livingWith,
      householdMembers: values.householdMembers.map((member) => ({ ...member, occupation: member.occupation || null, approximateAge: member.approximateAge ?? null })),
      primaryCaregiver: values.primaryCaregiver,
      otherCaregiver: values.primaryCaregiver === 'OTHER' ? values.otherCaregiver || null : null,
      familyRelationships: values.familyRelationships,
      supportNetworks: values.supportNetworks,
      otherSupportNetwork: values.supportNetworks.includes('OTHER') ? values.otherSupportNetwork || null : null,
      professionalObservation: values.professionalObservation || null,
      completedAt: new Date().toISOString(),
      version: recordVersion,
    };
    await saveSocialRecordOffline(input);
    await db.drafts.delete(draftId);
    navigate(`/deportistas/${athleteId}`, { state: { message: online ? 'Ficha social guardada. Sincronizando…' : 'Ficha guardada en este dispositivo.' } });
  }

  if (!ready) return <div className="p-12 text-center text-sm text-slate-500">Preparando ficha social…</div>;
  return (
    <div className="mx-auto max-w-4xl">
      <Link to={`/deportistas/${athleteId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17} /> Volver al expediente</Link>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-coral-600">Ficha Social v1</p><h1 className="mt-1 font-display text-4xl text-pine-900">{athlete ? `${athlete.firstNames} ${athlete.lastNames}` : 'Ficha social'}</h1><p className="mt-2 text-sm text-slate-500">Pregunta {step} de 3 · {draftStatus}</p></div>
        {!online && <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800"><WifiOff size={15} /> Sin conexión</span>}
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-pine-100"><div className="h-full rounded-full bg-coral-500 transition-all" style={{ width: `${(step / 3) * 100}%` }} /></div>

      <form className="mt-6" onSubmit={handleSubmit(complete)}>
        {step === 1 && <section className="card p-5 md:p-8">
          <h2 className="font-display text-3xl text-pine-900">Composición familiar</h2>
          <p className="mt-2 text-sm text-slate-500">¿Con quién vive actualmente el deportista?</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{livingOptions.map(([value, label]) => <CheckOption key={value} value={value} label={label} registration={register('livingWith')} />)}</div>
          {errors.livingWith?.message && <p className="mt-3 text-sm text-red-600">{errors.livingWith.message}</p>}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-7"><div><h3 className="font-semibold text-pine-900">Integrantes del hogar</h3><p className="mt-1 text-xs text-slate-500">Agrégalos individualmente cuando tengas la información.</p></div><button type="button" className="btn-secondary px-4" onClick={() => append({ id: createId(), name: '', relationship: '', approximateAge: null, livesWithAthlete: true, occupation: '', relationshipQuality: 'ADEQUATE' })}><Plus size={17} /> Agregar</button></div>
          <div className="mt-5 space-y-4">{fields.length === 0 && <p className="rounded-xl bg-sand-50 p-5 text-center text-sm text-slate-500">Aún no has agregado integrantes.</p>}{fields.map((field, index) => <div key={field.id} className="rounded-2xl border border-slate-100 bg-sand-50 p-4"><div className="mb-4 flex justify-between"><p className="text-sm font-bold text-pine-900">Integrante {index + 1}</p><button type="button" aria-label={`Eliminar integrante ${index + 1}`} className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => remove(index)}><Trash2 size={17} /></button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><SmallField label="Nombre *"><input className="field" {...register(`householdMembers.${index}.name`)} /></SmallField><SmallField label="Parentesco *"><input className="field" {...register(`householdMembers.${index}.relationship`)} /></SmallField><SmallField label="Edad aproximada"><input type="number" className="field" {...register(`householdMembers.${index}.approximateAge`, { setValueAs: (value) => value === '' ? null : Number(value) })} /></SmallField><SmallField label="Ocupación"><input className="field" {...register(`householdMembers.${index}.occupation`)} /></SmallField><SmallField label="Relación"><select className="field" {...register(`householdMembers.${index}.relationshipQuality`)}><option value="CLOSE">Cercana</option><option value="ADEQUATE">Adecuada</option><option value="DISTANT">Distante</option><option value="CONFLICTIVE">Conflictiva</option><option value="UNKNOWN">Sin información</option></select></SmallField><label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4"><input type="checkbox" className="h-5 w-5 accent-pine-700" {...register(`householdMembers.${index}.livesWithAthlete`)} /><span className="text-sm font-medium">Vive con el deportista</span></label></div></div>)}</div>
        </section>}

        {step === 2 && <section className="card p-5 md:p-8">
          <h2 className="font-display text-3xl text-pine-900">Cuidado y relaciones</h2>
          <label className="mt-7 block"><span className="text-sm font-semibold text-slate-700">Cuidador principal *</span><select className="field mt-2" {...register('primaryCaregiver')}><option value="MOTHER">Madre</option><option value="FATHER">Padre</option><option value="BOTH">Ambos</option><option value="GRANDPARENT">Abuelo/a</option><option value="OTHER_RELATIVE">Otro familiar</option><option value="OTHER">Otro</option></select></label>
          {watch('primaryCaregiver') === 'OTHER' && <label className="mt-5 block"><span className="text-sm font-semibold text-slate-700">¿Cuál?</span><input className="field mt-2" {...register('otherCaregiver')} /></label>}
          <fieldset className="mt-8"><legend className="text-sm font-semibold text-slate-700">¿Cómo considera actualmente las relaciones familiares?</legend><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['VERY_GOOD', 'Muy buenas'], ['GOOD', 'Buenas'], ['REGULAR', 'Regulares'], ['DIFFICULT', 'Difíciles']].map(([value, label]) => <label key={value} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 hover:border-pine-300"><input type="radio" value={value} className="h-5 w-5 accent-pine-700" {...register('familyRelationships')} /><span className="font-medium text-slate-700">{label}</span></label>)}</div></fieldset>
        </section>}

        {step === 3 && <section className="card p-5 md:p-8">
          <h2 className="font-display text-3xl text-pine-900">Redes de apoyo</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Cuando el deportista o la familia necesita ayuda, cuenta principalmente con:</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{networkOptions.map(([value, label]) => <CheckOption key={value} value={value} label={label} registration={register('supportNetworks')} />)}</div>
          {errors.supportNetworks?.message && <p className="mt-3 text-sm text-red-600">{errors.supportNetworks.message}</p>}
          {watch('supportNetworks').includes('OTHER') && <label className="mt-5 block"><span className="text-sm font-semibold text-slate-700">Otra red de apoyo</span><input className="field mt-2" {...register('otherSupportNetwork')} /></label>}
          <label className="mt-8 block border-t border-slate-100 pt-7"><span className="text-sm font-semibold text-slate-700">Observación profesional opcional</span><span className="mt-1 block text-xs text-slate-500">Este campo corresponde a la valoración de Trabajo Social y no se mezcla con las respuestas informadas.</span><textarea rows={5} className="field mt-3 py-3" {...register('professionalObservation')} /></label>
        </section>}

        <div className="sticky bottom-4 z-20 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white bg-white/90 p-4 shadow-soft backdrop-blur">
          <button type="button" className="btn-secondary" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}><ChevronLeft size={18} /> <span className="hidden sm:inline">Anterior</span></button>
          <button type="button" className="hidden text-xs font-semibold text-slate-500 sm:block" onClick={() => db.drafts.put({ id: draftId, formType: 'social-record', subjectId: athleteId, data: getValues(), updatedAt: new Date().toISOString(), createdBy: user?.id ?? '' }).then(() => setDraftStatus('Borrador guardado'))}><Save size={14} className="mr-1 inline" /> Guardar borrador</button>
          {step < 3 ? <button type="button" className="btn-primary" onClick={() => void next()}>Siguiente <ChevronRight size={18} /></button> : <button className="btn-primary" disabled={isSubmitting}><Check size={18} /> {isSubmitting ? 'Guardando…' : 'Finalizar ficha'}</button>}
        </div>
      </form>
    </div>
  );
}

function CheckOption({ value, label, registration }: { value: string; label: string; registration: ReturnType<ReturnType<typeof useForm<FormValues>>['register']> }) {
  return <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition hover:border-pine-300"><input type="checkbox" value={value} className="h-5 w-5 accent-pine-700" {...registration} /><span className="text-sm font-medium text-slate-700">{label}</span></label>;
}
function SmallField({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>; }
