import { ArrowDown, ArrowUp, BookOpenCheck, Edit3, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ScreeningInstrumentData, ScreeningInstrumentInput, ScreeningQuestionData } from '@socialapp/shared';
import { api } from '../lib/api';

const ageGroups = ['6 a 9 años', '10 a 13 años', '14 a 17 años'];
const types: Array<{ value: ScreeningQuestionData['type']; label: string }> = [
  { value: 'YES_NO', label: 'Sí / No' },
  { value: 'SINGLE_CHOICE', label: 'Una opción' },
  { value: 'MULTIPLE_CHOICE', label: 'Varias opciones' },
  { value: 'SCALE', label: 'Escala' },
  { value: 'TEXT', label: 'Texto libre' },
  { value: 'NUMBER', label: 'Número' },
];

type EditableQuestion = Omit<ScreeningQuestionData, 'position'> & { optionsText: string };

function blankQuestion(): EditableQuestion {
  return { id: crypto.randomUUID(), dimension: 'General', prompt: '', type: 'YES_NO', options: ['Sí', 'No'], optionsText: 'Sí, No', required: true };
}

export function InstrumentsPage() {
  const [items, setItems] = useState<ScreeningInstrumentData[]>([]);
  const [editing, setEditing] = useState<ScreeningInstrumentData>();
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState(ageGroups[0]!);
  const [questions, setQuestions] = useState<EditableQuestion[]>([blankQuestion()]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() { setItems(await api.manageableInstruments()); }
  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'No fue posible cargar los instrumentos.')); }, []);

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

  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-coral-600">Configuración de tamizajes</p><h1 className="font-display text-4xl text-pine-900">Instrumentos</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Crea y actualiza los cuestionarios que se seleccionan al preparar una brigada. Al editar se genera una nueva versión para conservar intactos los resultados anteriores.</p></div><button className="btn-primary shrink-0" onClick={beginCreate}><Plus size={18}/> Nuevo instrumento</button></div>
    {message && <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
    {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
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
    <div className="mt-6 grid gap-4 lg:grid-cols-2">{items.map((item) => <article key={item.id} className={`card p-5 ${item.active ? '' : 'opacity-70'}`}><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pine-50 text-pine-700"><BookOpenCheck size={21}/></div><div><h2 className="font-semibold text-pine-900">{item.name} v{item.version}</h2><p className="mt-1 text-xs text-slate-500">{item.ageGroup || 'Sin rango de edad'} · {item.questions.length} {item.questions.length === 1 ? 'pregunta' : 'preguntas'} · {item.active ? 'Disponible' : 'Retirado'}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.active ? 'Activo' : 'Histórico'}</span></div><div className="mt-5 flex flex-wrap gap-2"><button className="btn-secondary min-h-10 px-3 py-2" onClick={() => beginEdit(item)}><Edit3 size={16}/> Editar</button><button className="btn-secondary min-h-10 px-3 py-2" onClick={() => void toggle(item)}><RotateCcw size={16}/> {item.active ? 'Retirar' : 'Reactivar'}</button></div></article>)}</div>
  </div>;
}
