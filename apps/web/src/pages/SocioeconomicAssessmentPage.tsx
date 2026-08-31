import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AthleteRecord, SocioeconomicAssessmentInput } from '@socialapp/shared';
import { loadAthlete } from '../features/athletes/athlete-repository';
import { loadWorkspace, saveAssessmentOffline } from '../features/work/work-repository';
import { useConnection } from '../hooks/useConnection';
import { createId } from '../lib/uuid';

const initial = (athleteId: string): SocioeconomicAssessmentInput => ({
  id: createId(), athleteId, instrumentVersion: 1, status: 'COMPLETED', housingType: 'HOUSE', housingTenure: 'FAMILY',
  bedrooms: 2, householdSize: 4, zone: 'URBAN', utilities: ['ELECTRICITY', 'POTABLE_WATER'], exclusiveKitchen: true,
  transportMode: 'WALKING', travelTime: 'FROM_15_TO_30', transportDifficulty: 'NEVER', foodReduction: 'NEVER',
  foodBeforeTraining: 'ALWAYS', incomeRange: 'FROM_1_TO_2_SMMLV', dependents: 3, informedObservation: '', professionalAssessment: '',
  completedAt: new Date().toISOString(), version: 0,
});

export function SocioeconomicAssessmentPage() {
  const { id = '' } = useParams(); const navigate = useNavigate(); const online = useConnection();
  const [athlete, setAthlete] = useState<AthleteRecord>(); const [values, setValues] = useState(() => initial(id)); const [step, setStep] = useState(1); const [saving, setSaving] = useState(false);
  useEffect(() => { Promise.all([loadAthlete(id), loadWorkspace(id)]).then(([person, workspace]) => { setAthlete(person); if (workspace.socioeconomicAssessment) setValues(workspace.socioeconomicAssessment); }); }, [id]);
  const update = <K extends keyof SocioeconomicAssessmentInput>(key: K, value: SocioeconomicAssessmentInput[K]) => setValues((current) => ({ ...current, [key]: value }));
  const toggleUtility = (value: string) => update('utilities', values.utilities.includes(value) ? values.utilities.filter((item) => item !== value) : [...values.utilities, value]);
  async function finish() { setSaving(true); await saveAssessmentOffline({ ...values, status: 'COMPLETED', completedAt: new Date().toISOString() }); navigate(`/deportistas/${id}`, { state: { message: online ? 'Caracterización guardada. Sincronizando…' : 'Caracterización guardada en este dispositivo.' } }); }
  return <div className="mx-auto max-w-4xl">
    <Link to={`/deportistas/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Volver al expediente</Link>
    <header className="mt-5"><p className="text-sm font-bold text-coral-600">Caracterización socioeconómica v1</p><h1 className="mt-1 font-display text-4xl text-pine-900">{athlete ? `${athlete.firstNames} ${athlete.lastNames}` : 'Caracterización'}</h1><p className="mt-2 text-sm text-slate-500">Paso {step} de 4 · Guardado local seguro</p>{!online && <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"><WifiOff size={15}/> Sin conexión</span>}</header>
    <div className="mt-5 h-2 overflow-hidden rounded-full bg-pine-100"><div className="h-full bg-coral-500 transition-all" style={{ width: `${step * 25}%` }}/></div>
    <section className="card mt-6 p-5 md:p-8">
      {step === 1 && <><Title title="Vivienda" note="Condiciones generales informadas por la familia."/><Grid>
        <Select label="Tipo de vivienda" value={values.housingType} onChange={(v) => update('housingType', v as typeof values.housingType)} options={[['HOUSE','Casa'],['APARTMENT','Apartamento'],['OTHER','Otro']]}/>
        <Select label="Tenencia" value={values.housingTenure} onChange={(v) => update('housingTenure', v as typeof values.housingTenure)} options={[['OWNED','Propia'],['RENTED','Arrendada'],['FAMILY','Familiar'],['OTHER','Otra']]}/>
        <NumberField label="Dormitorios" value={values.bedrooms} onChange={(v) => update('bedrooms', v)} min={1}/>
        <NumberField label="Personas en la vivienda" value={values.householdSize} onChange={(v) => update('householdSize', v)} min={1}/>
        <Select label="Ubicación" value={values.zone} onChange={(v) => update('zone', v as typeof values.zone)} options={[['URBAN','Urbana'],['RURAL','Rural']]}/>
      </Grid><p className="mt-7 text-sm font-semibold text-slate-700">Servicios disponibles</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{([['ELECTRICITY','Energía eléctrica'],['GAS','Gas'],['SEWERAGE','Alcantarillado'],['POTABLE_WATER','Agua potable'],['INTERNET','Internet']] as const).map(([v,l]) => <CheckBox key={v} label={l} checked={values.utilities.includes(v)} onChange={() => toggleUtility(v)}/>)}</div><div className="mt-4"><CheckBox label="Cuenta con espacio exclusivo para cocinar" checked={values.exclusiveKitchen} onChange={() => update('exclusiveKitchen', !values.exclusiveKitchen)}/></div></>}
      {step === 2 && <><Title title="Transporte" note="Barreras que pueden afectar la asistencia."/><Grid>
        <Select label="Desplazamiento habitual" value={values.transportMode} onChange={(v) => update('transportMode', v as typeof values.transportMode)} options={[['WALKING','Caminando'],['BICYCLE','Bicicleta'],['PUBLIC_TRANSPORT','Transporte público'],['MOTORCYCLE','Moto'],['FAMILY_TRANSPORT','Transporte familiar'],['INSTITUTIONAL_TRANSPORT','Transporte institucional'],['OTHER','Otro']]}/>
        <Select label="Tiempo de desplazamiento" value={values.travelTime} onChange={(v) => update('travelTime', v as typeof values.travelTime)} options={[['UNDER_15','Menos de 15 min'],['FROM_15_TO_30','15–30 min'],['FROM_31_TO_60','31–60 min'],['OVER_60','Más de 60 min']]}/>
        <Select label="¿Dificulta la asistencia?" value={values.transportDifficulty} onChange={(v) => update('transportDifficulty', v as typeof values.transportDifficulty)} options={[['NEVER','Nunca'],['SOMETIMES','Algunas veces'],['FREQUENTLY','Frecuentemente']]}/>
      </Grid></>}
      {step === 3 && <><Title title="Seguridad alimentaria" note="Preguntas preventivas, sin generar diagnósticos."/><div className="space-y-6">
        <Select label="¿Se redujo la cantidad o calidad de alimentos por falta de recursos durante el último mes?" value={values.foodReduction} onChange={(v) => update('foodReduction', v as typeof values.foodReduction)} options={[['NEVER','No'],['SOMETIMES','Algunas veces'],['FREQUENTLY','Frecuentemente']]}/>
        <Select label="¿Consume algún alimento antes del entrenamiento?" value={values.foodBeforeTraining} onChange={(v) => update('foodBeforeTraining', v as typeof values.foodBeforeTraining)} options={[['ALWAYS','Siempre'],['SOMETIMES','Algunas veces'],['RARELY','Rara vez'],['NEVER','Nunca']]}/>
      </div></>}
      {step === 4 && <><Title title="Situación económica y valoración" note="El dato informado y la valoración profesional permanecen separados."/><Grid>
        <Select label="Ingreso familiar aproximado" value={values.incomeRange} onChange={(v) => update('incomeRange', v as typeof values.incomeRange)} options={[['UNDER_1_SMMLV','Menos de 1 SMMLV'],['FROM_1_TO_2_SMMLV','Entre 1 y 2 SMMLV'],['FROM_2_TO_3_SMMLV','Entre 2 y 3 SMMLV'],['OVER_3_SMMLV','Más de 3 SMMLV'],['PREFER_NOT_TO_SAY','Prefiere no responder']]}/>
        <NumberField label="Personas dependientes" value={values.dependents} onChange={(v) => update('dependents', v)} min={0}/>
      </Grid><label className="mt-6 block"><span className="text-sm font-semibold text-slate-700">Dato informado / observación familiar</span><textarea className="field mt-2 py-3" rows={3} value={values.informedObservation ?? ''} onChange={(e) => update('informedObservation', e.target.value)}/></label><label className="mt-5 block rounded-2xl bg-pine-50 p-4"><span className="text-sm font-semibold text-pine-900">Valoración profesional de Trabajo Social</span><textarea className="field mt-2 py-3" rows={4} value={values.professionalAssessment ?? ''} onChange={(e) => update('professionalAssessment', e.target.value)}/></label></>}
    </section>
    <div className="sticky bottom-4 mt-5 flex justify-between rounded-2xl bg-white/95 p-4 shadow-soft"><button className="btn-secondary" disabled={step === 1} onClick={() => setStep((v) => v - 1)}><ChevronLeft size={18}/> Anterior</button>{step < 4 ? <button className="btn-primary" onClick={() => setStep((v) => v + 1)}>Siguiente <ChevronRight size={18}/></button> : <button className="btn-primary" disabled={saving} onClick={() => void finish()}><Check size={18}/> {saving ? 'Guardando…' : 'Finalizar'}</button>}</div>
  </div>;
}
function Title({ title, note }: { title: string; note: string }) { return <div className="mb-7"><h2 className="font-display text-3xl text-pine-900">{title}</h2><p className="mt-2 text-sm text-slate-500">{note}</p></div>; }
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-5 sm:grid-cols-2">{children}</div>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label><span className="text-sm font-semibold text-slate-700">{label}</span><select className="field mt-2" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>; }
function NumberField({ label, value, onChange, min }: { label: string; value: number; onChange: (value: number) => void; min: number }) { return <label><span className="text-sm font-semibold text-slate-700">{label}</span><input type="number" min={min} className="field mt-2" value={value} onChange={(e) => onChange(Number(e.target.value))}/></label>; }
function CheckBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) { return <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4"><input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 accent-pine-700"/><span className="text-sm font-medium">{label}</span></label>; }
