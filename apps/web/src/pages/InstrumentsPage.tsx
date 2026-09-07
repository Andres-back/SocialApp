import { ArrowDown, ArrowRight, ArrowUp, BookOpenCheck, Edit3, Eye, FileText, Home, Network, Plus, Printer, RotateCcw, Save, Search, ShieldAlert, StickyNote, Trash2, UsersRound, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { AthleteRecord, ScreeningInstrumentData, ScreeningInstrumentInput, ScreeningQuestionData, SystemInstrumentConfigurationData, SystemInstrumentQuestionData } from '@socialapp/shared';
import { loadAthletes } from '../features/athletes/athlete-repository';
import { configuredSystemInstrument, screeningInstrumentPath, SYSTEM_INSTRUMENTS, systemInstrumentPath, type SystemInstrumentDefinition, type SystemInstrumentKind } from '../features/instruments/instrument-catalog';
import { invalidateSystemInstrumentConfigurations, loadSystemInstrumentConfigurations } from '../features/instruments/useSystemInstrument';
import { useAuth } from '../features/auth/useAuth';
import { loadManageableInstruments } from '../features/work/work-repository';
import { api } from '../lib/api';
import { createId } from '../lib/uuid';

const ageGroups = ['6 a 9 años', '10 a 13 años', '14 a 17 años'];
const types: Array<{ value: ScreeningQuestionData['type']; label: string }> = [
  { value: 'YES_NO', label: 'Sí / No' },
  { value: 'SINGLE_CHOICE', label: 'Una opción' },
  { value: 'MULTIPLE_CHOICE', label: 'Varias opciones' },
  { value: 'SCALE', label: 'Escala' },
  { value: 'TEXT', label: 'Texto libre' },
  { value: 'NUMBER', label: 'Número' },
];
const systemIcons: Record<SystemInstrumentKind, LucideIcon> = {
  'social-record': FileText, 'socioeconomic-assessment': Home, 'alert-assessment': ShieldAlert,
  'social-follow-up': BookOpenCheck, 'professional-observation': StickyNote, genogram: UsersRound, ecomap: Network,
};

type EditableQuestion = Omit<ScreeningQuestionData, 'position'> & { optionsText: string };

function blankQuestion(): EditableQuestion {
  return { id: createId(), dimension: 'General', prompt: '', type: 'YES_NO', options: ['Sí', 'No'], optionsText: 'Sí, No', required: true };
}

export function InstrumentsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedAthleteId = searchParams.get('athleteId') ?? '';
  const [items, setItems] = useState<ScreeningInstrumentData[]>([]);
  const [systemConfigurations, setSystemConfigurations] = useState<SystemInstrumentConfigurationData[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState(requestedAthleteId);
  const [editing, setEditing] = useState<ScreeningInstrumentData>();
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState(ageGroups[0]!);
  const [questions, setQuestions] = useState<EditableQuestion[]>([blankQuestion()]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewingSystem, setPreviewingSystem] = useState<SystemInstrumentDefinition>();
  const [editingSystem, setEditingSystem] = useState<SystemInstrumentDefinition>();
  const [systemQuestions, setSystemQuestions] = useState<SystemInstrumentQuestionData[]>([]);

  const load = useCallback(async () => {
    const [forms, people, configurations] = await Promise.all([loadManageableInstruments(), loadAthletes(), loadSystemInstrumentConfigurations(true)]);
    setItems(forms); setAthletes(people); setSystemConfigurations(configurations);
    if (requestedAthleteId && people.some((person) => person.id === requestedAthleteId)) setSelectedAthleteId(requestedAthleteId);
  }, [requestedAthleteId]);
  useEffect(() => {
    const refresh = () => void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'No fue posible cargar los instrumentos.'));
    const refreshVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    const timer = window.setInterval(refreshVisible, 15_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [load]);
  const visibleAthletes = useMemo(() => {
    const term = athleteSearch.trim().toLocaleLowerCase('es');
    return athletes.filter((person) => !term || `${person.firstNames} ${person.lastNames} ${person.internalCode}`.toLocaleLowerCase('es').includes(term));
  }, [athletes, athleteSearch]);
  const selectedAthlete = athletes.find((person) => person.id === selectedAthleteId);
  const availableSystemInstruments = SYSTEM_INSTRUMENTS.filter((instrument) => can(instrument.permission)).map((instrument) => configuredSystemInstrument(instrument, systemConfigurations));
  function requireAthlete(): string | undefined {
    if (selectedAthleteId) return selectedAthleteId;
    setError('Selecciona primero el deportista al que aplicarás el instrumento.');
    document.getElementById('seleccionar-deportista')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return undefined;
  }
  function applySystem(kind: SystemInstrumentKind) { const athleteId = requireAthlete(); if (athleteId) navigate(systemInstrumentPath(kind, athleteId)); }
  function applyScreening(instrumentId: string) { const athleteId = requireAthlete(); if (athleteId) navigate(screeningInstrumentPath(instrumentId, athleteId)); }
  function printInstrument(source: 'system' | 'questionnaire', instrumentId: string, filled: boolean) {
    const athleteQuery = filled && selectedAthleteId ? '?athleteId=' + encodeURIComponent(selectedAthleteId) : '';
    navigate('/instrumentos/imprimir/' + source + '/' + encodeURIComponent(instrumentId) + athleteQuery);
  }
  function previewSystem(instrument: SystemInstrumentDefinition) {
    setEditingSystem(undefined); setPreviewingSystem(instrument); setSystemQuestions(instrument.questions); setError('');
    window.requestAnimationFrame(() => document.getElementById('detalle-instrumento-institucional')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function editSystem(instrument: SystemInstrumentDefinition) {
    setPreviewingSystem(instrument); setEditingSystem(instrument); setSystemQuestions(instrument.questions.map((question) => ({ ...question }))); setError('');
    window.requestAnimationFrame(() => document.getElementById('detalle-instrumento-institucional')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  async function saveSystemQuestions() {
    if (!editingSystem) return;
    if (systemQuestions.some((question) => !question.prompt.trim())) return setError('Completa el texto de todas las preguntas.');
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = await api.saveSystemInstrument(editingSystem.kind, systemQuestions.map((question) => ({ ...question, prompt: question.prompt.trim() })));
      invalidateSystemInstrumentConfigurations();
      const configurations = await loadSystemInstrumentConfigurations(true);
      setSystemConfigurations(configurations);
      const updated = configuredSystemInstrument(editingSystem, [saved]);
      setPreviewingSystem(updated); setEditingSystem(undefined); setSystemQuestions(updated.questions);
      setMessage('Preguntas de “' + editingSystem.name + '” actualizadas y sincronizadas para todos los usuarios.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible actualizar las preguntas.'); }
    finally { setSaving(false); }
  }

  function beginCreate() {
    setEditing(undefined); setName(''); setAgeGroup(ageGroups[0]!); setQuestions([blankQuestion()]); setError(''); setOpen(true);
  }
  function beginEdit(item: ScreeningInstrumentData) {
    setEditing(item); setName(item.name); setAgeGroup(item.ageGroup || ageGroups[0]!);
    setQuestions(item.questions.map((question) => ({ ...question, optionsText: question.options.join(', ') })));
    setError(''); setOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function updateQuestion(index: number, patch: Partial<EditableQuestion>) {
    setQuestions((current) => current.map((question, currentIndex) => currentIndex === index ? { ...question, ...patch } : question));
  }
  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= questions.length) return;
    setQuestions((current) => { const next = [...current]; [next[index], next[target]] = [next[target]!, next[index]!]; return next; });
  }
  async function save() {
    setError(''); setMessage('');
    if (!name.trim()) return setError('Escribe el nombre del instrumento.');
    if (questions.length === 0 || questions.some((question) => !question.prompt.trim())) return setError('Agrega al menos una pregunta y completa todos sus enunciados.');
    const normalized = questions.map((question) => {
      const usesOptions = !['TEXT', 'NUMBER'].includes(question.type);
      const options = usesOptions ? question.optionsText.split(',').map((option) => option.trim()).filter(Boolean) : [];
      if (usesOptions && options.length < 2) throw new Error(`La pregunta “${question.prompt}” necesita al menos dos opciones separadas por coma.`);
      return { id: question.id, dimension: question.dimension.trim() || 'General', prompt: question.prompt.trim(), type: question.type, options, required: question.required };
    });
    const input: ScreeningInstrumentInput = { id: editing?.id, name: name.trim(), ageGroup, active: true, questions: normalized };
    setSaving(true);
    try {
      const saved = await api.saveOperationalInstrument(input);
      setMessage(editing ? `Nueva versión v${saved.version} creada; la versión anterior se conservó para sus resultados.` : 'Instrumento creado y disponible para nuevas brigadas.');
      setOpen(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible guardar el instrumento.'); }
    finally { setSaving(false); }
  }
  async function toggle(item: ScreeningInstrumentData) {
    setError(''); await api.updateInstrumentStatus(item.id, !item.active); await load();
  }
  async function remove(item: ScreeningInstrumentData) {
    if (!window.confirm(`¿Eliminar el cuestionario “${item.name}” y todas sus versiones? Dejará de aparecer para nuevas aplicaciones, pero los resultados históricos se conservarán.`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await api.deleteInstrument(item.id);
      setMessage(`Cuestionario “${item.name}” eliminado. Los resultados anteriores permanecen en sus expedientes.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible eliminar el cuestionario.'); }
    finally { setSaving(false); }
  }

  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-coral-600">Centro de aplicación</p><h1 className="font-display text-4xl text-pine-900">Instrumentos</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Todos los formularios de Trabajo Social se aplican desde aquí. El registro de deportistas permanece separado para agilizar el ingreso de la población.</p></div><button className="btn-primary shrink-0" onClick={beginCreate}><Plus size={18}/> Nuevo cuestionario</button></div>
    {message && <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
    {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section id="seleccionar-deportista" className="card mt-6 p-5 md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">Paso 1</p><h2 className="mt-1 font-display text-3xl text-pine-900">Selecciona el deportista</h2><p className="mt-1 text-sm text-slate-500">Las respuestas quedarán vinculadas automáticamente a su expediente.</p></div>{selectedAthlete && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><strong>{selectedAthlete.firstNames} {selectedAthlete.lastNames}</strong><span className="ml-2 text-emerald-600">{selectedAthlete.internalCode}</span></div>}</div>
      <label className="relative mt-5 block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><span className="sr-only">Buscar deportista</span><input className="field pl-11" placeholder="Buscar por nombre o código…" value={athleteSearch} onChange={(event) => setAthleteSearch(event.target.value)}/></label>
      <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{visibleAthletes.map((person) => <button key={person.id} type="button" onClick={() => { setSelectedAthleteId(person.id); setError(''); }} className={`rounded-xl border p-3 text-left transition ${selectedAthleteId === person.id ? 'border-pine-600 bg-pine-50 ring-2 ring-pine-100' : 'border-slate-200 bg-white hover:border-pine-200'}`}><span className="block text-sm font-semibold text-pine-900">{person.firstNames} {person.lastNames}</span><span className="mt-1 block text-xs text-slate-500">{person.internalCode} · {person.age} años · {person.sportName}</span></button>)}</div>
      {visibleAthletes.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No encontramos deportistas con esa búsqueda.</p>}
    </section>
    <section className="mt-8"><div><p className="eyebrow">Paso 2</p><h2 className="mt-1 font-display text-3xl text-pine-900">Instrumentos institucionales</h2><p className="mt-2 text-sm text-slate-500">Puedes revisar o ajustar sus preguntas antes de aplicarlos. Los cambios se sincronizan con el equipo.</p></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{availableSystemInstruments.map((instrument) => { const Icon = systemIcons[instrument.kind]; return <article key={instrument.kind} className="card flex flex-col p-5"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-pine-50 text-pine-700"><Icon size={21}/></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">v{instrument.version}</span></div><p className="mt-4 text-xs font-bold uppercase tracking-wide text-coral-600">{instrument.area}</p><h3 className="mt-1 text-lg font-bold text-pine-900">{instrument.name}</h3><p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{instrument.description}</p><p className="mt-3 text-xs font-semibold text-slate-400">{instrument.questions.length} campos o preguntas</p><div className="mt-5 grid grid-cols-2 gap-2"><button className="btn-secondary min-h-10 px-3 py-2" onClick={() => previewSystem(instrument)}><Eye size={16}/> Vista previa</button><button className="btn-secondary min-h-10 px-3 py-2" onClick={() => editSystem(instrument)}><Edit3 size={16}/> Editar preguntas</button><button className="btn-secondary min-h-10 px-3 py-2" onClick={() => printInstrument('system', instrument.kind, false)}><Printer size={16}/> Imprimir en blanco</button>{selectedAthleteId && <button className="btn-secondary min-h-10 px-3 py-2" onClick={() => printInstrument('system', instrument.kind, true)}><Printer size={16}/> Imprimir diligenciado</button>}<button className="btn-primary col-span-2 min-h-10 py-2" onClick={() => applySystem(instrument.kind)}>Aplicar <ArrowRight size={17}/></button></div></article>; })}</div></section>
    {previewingSystem && <section id="detalle-instrumento-institucional" className="card scroll-mt-24 mt-6 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-coral-600">{editingSystem ? 'Editar preguntas institucionales' : 'Vista previa'}</p><h2 className="mt-1 font-display text-3xl text-pine-900">{previewingSystem.name}</h2><p className="mt-2 text-sm text-slate-500">{editingSystem ? 'Puedes cambiar los enunciados. La estructura y el tipo de dato permanecen protegidos para conservar los expedientes existentes.' : 'Así verá la trabajadora social las ' + systemQuestions.length + ' preguntas antes de aplicar el formulario.'}</p></div><button className="btn-secondary" onClick={() => { setPreviewingSystem(undefined); setEditingSystem(undefined); }}>Cerrar</button></div>
      <div className="mt-6 space-y-3">{systemQuestions.map((question, index) => <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral-50 text-xs font-bold text-coral-700">{index + 1}</span>{editingSystem ? <label className="flex-1"><span className="sr-only">Pregunta {index + 1}</span><textarea className="field py-3" rows={2} value={question.prompt} onChange={(event) => setSystemQuestions((current) => current.map((item) => item.id === question.id ? { ...item, prompt: event.target.value } : item))}/><span className="mt-1 block text-xs text-slate-400">Campo protegido: {question.id}</span></label> : <p className="pt-1 text-sm font-semibold leading-6 text-pine-900">{question.prompt}</p>}</div></article>)}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">{editingSystem ? <><button className="btn-secondary" onClick={() => { setEditingSystem(undefined); setSystemQuestions(previewingSystem.questions); }}>Cancelar edición</button><button className="btn-primary" disabled={saving} onClick={() => void saveSystemQuestions()}><Save size={17}/> {saving ? 'Guardando…' : 'Guardar y sincronizar'}</button></> : <><button className="btn-secondary" onClick={() => editSystem(previewingSystem)}><Edit3 size={16}/> Editar preguntas</button><button className="btn-secondary" onClick={() => printInstrument('system', previewingSystem.kind, false)}><Printer size={16}/> Imprimir en blanco</button>{selectedAthleteId && <button className="btn-secondary" onClick={() => printInstrument('system', previewingSystem.kind, true)}><Printer size={16}/> Imprimir diligenciado</button>}<button className="btn-primary" onClick={() => applySystem(previewingSystem.kind)}>Aplicar <ArrowRight size={17}/></button></>}</div>
    </section>}
    <section className="mt-9"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Cuestionarios configurables</p><h2 className="mt-1 font-display text-3xl text-pine-900">Tamizajes y entrevistas</h2><p className="mt-2 max-w-3xl text-sm text-slate-500">Puedes aplicarlos individualmente o incluirlos en una brigada. Al editar se crea una versión nueva y los resultados anteriores permanecen intactos.</p></div><button className="btn-secondary shrink-0" onClick={beginCreate}><Plus size={18}/> Crear cuestionario</button></div></section>
    {open && <section className="card mt-6 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-coral-600">{editing ? `Editar ${editing.name} v${editing.version}` : 'Nuevo cuestionario'}</p><h2 className="mt-1 font-display text-3xl text-pine-900">{editing ? 'Crear nueva versión' : 'Configurar instrumento'}</h2></div><button className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold text-slate-700">Nombre *</span><input className="field" value={name} onChange={(event) => setName(event.target.value)}/></label><label><span className="mb-2 block text-sm font-semibold text-slate-700">Rango de edad *</span><select className="field" value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>{ageGroups.map((group) => <option key={group}>{group}</option>)}</select></label></div>
      <div className="mt-7 flex items-center justify-between"><div><h3 className="font-display text-2xl text-pine-900">Preguntas</h3><p className="text-xs text-slate-500">{questions.length} configuradas</p></div><button className="btn-secondary" onClick={() => setQuestions((current) => [...current, blankQuestion()])}><Plus size={17}/> Agregar pregunta</button></div>
      <div className="mt-4 space-y-4">{questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-slate-200 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-pine-800">Pregunta {index + 1}</p><div className="flex gap-1"><button aria-label={`Subir pregunta ${index + 1}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16}/></button><button aria-label={`Bajar pregunta ${index + 1}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" disabled={index === questions.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16}/></button><button aria-label={`Eliminar pregunta ${index + 1}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter((_, currentIndex) => currentIndex !== index))}><Trash2 size={16}/></button></div></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2"><label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Enunciado *</span><textarea className="field py-3" rows={2} value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })}/></label><label><span className="mb-2 block text-sm font-semibold text-slate-700">Dimensión</span><input className="field" value={question.dimension} onChange={(event) => updateQuestion(index, { dimension: event.target.value })}/></label><label><span className="mb-2 block text-sm font-semibold text-slate-700">Tipo de respuesta</span><select className="field" value={question.type} onChange={(event) => { const type = event.target.value as ScreeningQuestionData['type']; updateQuestion(index, { type, optionsText: type === 'YES_NO' ? 'Sí, No' : question.optionsText }); }}>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>{!['TEXT', 'NUMBER'].includes(question.type) && <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Opciones separadas por coma *</span><input className="field" value={question.optionsText} onChange={(event) => updateQuestion(index, { optionsText: event.target.value })}/></label>}<label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" className="h-5 w-5 accent-pine-700" checked={question.required} onChange={(event) => updateQuestion(index, { required: event.target.checked })}/> Respuesta obligatoria</label></div>
      </article>)}</div>
      <button className="btn-primary mt-6 w-full" disabled={saving} onClick={() => void save()}><Save size={18}/> {saving ? 'Guardando…' : editing ? 'Crear nueva versión' : 'Guardar instrumento'}</button>
    </section>}
    <div className="mt-6 grid gap-4 lg:grid-cols-2">{items.map((item) => <article key={item.id} className={`card p-5 ${item.active ? '' : 'opacity-70'}`}><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pine-50 text-pine-700"><BookOpenCheck size={21}/></div><div><h2 className="font-semibold text-pine-900">{item.name} v{item.version}</h2><p className="mt-1 text-xs text-slate-500">{item.ageGroup || 'Sin rango de edad'} · {item.questions.length} {item.questions.length === 1 ? 'pregunta' : 'preguntas'} · {item.active ? 'Disponible' : 'Retirado'}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.active ? 'Activo' : 'Histórico'}</span></div><div className="mt-5 flex flex-wrap gap-2">{item.active && <button className="btn-primary min-h-10 px-3 py-2" onClick={() => applyScreening(item.id)}>Aplicar <ArrowRight size={16}/></button>}<button className="btn-secondary min-h-10 px-3 py-2" onClick={() => printInstrument('questionnaire', item.id, false)}><Printer size={16}/> Imprimir en blanco</button>{selectedAthleteId && <button className="btn-secondary min-h-10 px-3 py-2" onClick={() => printInstrument('questionnaire', item.id, true)}><Printer size={16}/> Imprimir diligenciado</button>}<button className="btn-secondary min-h-10 px-3 py-2" onClick={() => beginEdit(item)}><Edit3 size={16}/> Editar</button><button className="btn-secondary min-h-10 px-3 py-2" onClick={() => void toggle(item)}><RotateCcw size={16}/> {item.active ? 'Retirar' : 'Reactivar'}</button><button className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50" disabled={saving} onClick={() => void remove(item)}><Trash2 size={16}/> Eliminar</button></div></article>)}</div>
  </div>;
}
