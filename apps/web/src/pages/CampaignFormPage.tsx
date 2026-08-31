import { ArrowLeft, Save, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { instrumentMatchesAge, type AthleteRecord, type CampaignStatus, type CatalogItem, type ScreeningCampaignData, type ScreeningCampaignInput, type ScreeningInstrumentData, type SportsCatalogs } from '@socialapp/shared';
import { useAuth } from '../features/auth/useAuth';
import { loadAthletes, loadCatalogs } from '../features/athletes/athlete-repository';
import { loadCampaigns, loadInstruments, saveCampaignOffline } from '../features/work/work-repository';
import { createId } from '../lib/uuid';

const initialValues = { name: '', date: new Date().toISOString().slice(0, 10), place: '', programId: '', sportId: '', instrumentId: '', status: 'ACTIVE' as CampaignStatus };

function includeCurrent(items: CatalogItem[], id?: string | null, name?: string | null) {
  if (!id || !name || items.some((item) => item.id === id)) return items;
  return [...items, { id, name }].sort((left, right) => left.name.localeCompare(right.name, 'es'));
}

export function CampaignFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const requestedAthleteId = searchParams.get('athleteId');
  const requestedInstrumentId = searchParams.get('instrumentId');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [catalogs, setCatalogs] = useState<SportsCatalogs>();
  const [instruments, setInstruments] = useState<ScreeningInstrumentData[]>([]);
  const [existing, setExisting] = useState<ScreeningCampaignData>();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    Promise.all([loadAthletes(), loadCatalogs(), loadInstruments(), id ? loadCampaigns() : Promise.resolve([])]).then(([people, cats, forms, campaigns]) => {
      setAthletes(people); setInstruments(forms);
      const current = campaigns.find((campaign) => campaign.id === id);
      if (current) {
        setCatalogs({ ...cats, programs: includeCurrent(cats.programs, current.sportsProgramId, current.sportsProgramName), sports: includeCurrent(cats.sports, current.sportId, current.sportName) });
        setExisting(current); setSelected(current.participants.map((participant) => participant.athleteId));
        setValues({ name: current.name, date: current.date, place: current.place, programId: current.sportsProgramId ?? '', sportId: current.sportId ?? '', instrumentId: current.instrumentId, status: current.status });
      } else {
        setCatalogs(cats);
        const requested = people.find((athlete) => athlete.id === requestedAthleteId);
        const requestedInstrument = forms.find((instrument) => instrument.id === requestedInstrumentId);
        const matchedInstrument = requestedInstrument ?? (requested ? forms.find((instrument) => instrumentMatchesAge(instrument, requested.age)) : undefined);
        if (requested) {
          setSelected([requested.id]);
          setValues((state) => ({ ...state, name: `Tamizaje por edad - ${requested.firstNames} ${requested.lastNames}`, place: requested.municipality, programId: requested.sportsProgramId, sportId: requested.sportId, instrumentId: matchedInstrument?.id ?? forms[0]?.id ?? '' }));
          setSuggestion(matchedInstrument ? `${matchedInstrument.name} seleccionado para ${requested.age} años.` : `No hay un instrumento activo configurado para ${requested.age} años.`);
        } else if (requestedInstrument ?? forms[0]) setValues((state) => ({ ...state, instrumentId: (requestedInstrument ?? forms[0])!.id }));
      }
    });
  }, [id, requestedAthleteId, requestedInstrumentId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return athletes.filter((item) => (!values.programId || item.sportsProgramId === values.programId) && (!values.sportId || item.sportId === values.sportId) && (!term || `${item.firstNames} ${item.lastNames} ${item.internalCode}`.toLocaleLowerCase('es').includes(term)));
  }, [athletes, search, values.programId, values.sportId]);

  async function save() {
    setError('');
    const instrument = instruments.find((item) => item.id === values.instrumentId);
    if (!instrument) return setError('Selecciona el instrumento de la brigada.');
    const incompatible = instrument.ageGroup && ['6 a 9 años', '10 a 13 años', '14 a 17 años'].includes(instrument.ageGroup)
      ? athletes.filter((athlete) => selected.includes(athlete.id) && !instrumentMatchesAge(instrument, athlete.age)) : [];
    if (incompatible.length > 0) return setError(`El instrumento ${instrument.ageGroup} no corresponde a la edad de: ${incompatible.map((athlete) => `${athlete.firstNames} ${athlete.lastNames} (${athlete.age})`).join(', ')}.`);
    setSaving(true);
    try {
      const campaignId = existing?.id ?? createId();
      const campaignName = values.name.trim() || `Brigada ${instrument.name} · ${values.date}`;
      const input: ScreeningCampaignInput = {
        id: campaignId, name: campaignName, date: values.date, place: values.place.trim() || 'Por definir', sportsProgramId: values.programId || null,
        sportId: values.sportId || null, instrumentId: instrument.id, professionalName: existing?.professionalName ?? user?.displayName ?? 'Trabajo Social',
        athleteIds: selected, status: values.status, version: existing?.version ?? 0,
      };
      await saveCampaignOffline(input, instrument, Object.fromEntries(athletes.map((item) => [item.id, `${item.firstNames} ${item.lastNames}`])), {
        sportsProgramName: catalogs?.programs.find((item) => item.id === values.programId)?.name ?? null,
        sportName: catalogs?.sports.find((item) => item.id === values.sportId)?.name ?? null,
      });
      navigate(`/brigadas/${campaignId}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible guardar la brigada.'); }
    finally { setSaving(false); }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((item) => selected.includes(item.id));
  return <div className="mx-auto max-w-5xl">
    <Link to={existing ? `/brigadas/${existing.id}` : '/brigadas'} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Volver</Link>
    <h1 className="mt-5 font-display text-4xl text-pine-900">{existing ? 'Editar brigada' : 'Nueva brigada'}</h1>
    <p className="mt-2 text-sm text-slate-500">Solo debes seleccionar el instrumento. Puedes crear la brigada sin deportistas y asignarlos después; nombre y lugar también pueden completarse más adelante.</p>
    {suggestion && <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{suggestion}</div>}
    {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="card mt-6 grid gap-5 p-5 md:grid-cols-2 md:p-7">
      <Field label="Nombre de la brigada (opcional)"><input className="field" placeholder="Se genera automáticamente" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })}/></Field>
      <Field label="Fecha"><input type="date" className="field" value={values.date} onChange={(event) => setValues({ ...values, date: event.target.value })}/></Field>
      <Field label="Lugar (opcional)"><input className="field" placeholder="Por definir" value={values.place} onChange={(event) => setValues({ ...values, place: event.target.value })}/></Field>
      <Field label="Estado inicial"><select className="field" value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as CampaignStatus })}><option value="PLANNED">Planeada</option><option value="ACTIVE">En curso</option>{existing?.status === 'COMPLETED' && <option value="COMPLETED">Finalizada</option>}</select></Field>
      <Field label="Instrumento"><select className="field" value={values.instrumentId} onChange={(event) => setValues({ ...values, instrumentId: event.target.value })}>{instruments.map((item) => <option key={item.id} value={item.id}>{item.name} v{item.version}{item.ageGroup ? ` · ${item.ageGroup}` : ''}</option>)}</select></Field>
      <Field label="Programa"><select className="field" value={values.programId} onChange={(event) => setValues({ ...values, programId: event.target.value })}><option value="">Todos</option>{catalogs?.programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Deporte"><select className="field" value={values.sportId} onChange={(event) => setValues({ ...values, sportId: event.target.value })}><option value="">Todos</option>{catalogs?.sports.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Profesional responsable"><input className="field bg-slate-50" value={existing?.professionalName ?? user?.displayName ?? ''} readOnly/></Field>
    </section>
    <section className="card mt-6 p-5 md:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-2xl text-pine-900">Añadir deportistas <span className="text-base font-sans font-medium text-slate-400">(opcional)</span></h2><p className="text-sm text-slate-500">{selected.length === 0 ? 'Ninguno por ahora; podrás asignarlos al editar la brigada.' : `${selected.length} seleccionados · ${filtered.length} visibles`}</p></div><button className="text-sm font-bold text-pine-700" onClick={() => setSelected(allFilteredSelected ? selected.filter((athleteId) => !filtered.some((item) => item.id === athleteId)) : Array.from(new Set([...selected, ...filtered.map((item) => item.id)])))}>{allFilteredSelected ? 'Quitar visibles' : 'Seleccionar visibles'}</button></div>
      <label className="relative mt-5 block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><span className="sr-only">Buscar población</span><input className="field pl-11" placeholder="Buscar por nombre o código…" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{filtered.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" className="h-5 w-5 accent-pine-700" checked={selected.includes(item.id)} onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((athleteId) => athleteId !== item.id) : [...current, item.id])}/><div><p className="font-semibold text-pine-900">{item.firstNames} {item.lastNames}</p><p className="text-xs text-slate-500">{item.internalCode} · {item.sportName} · {item.categoryName}</p></div></label>)}</div>
      {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No hay deportistas que coincidan con los filtros.</p>}
    </section>
    <button className="btn-primary mt-6 w-full" disabled={saving} onClick={() => void save()}><Save size={18}/> {saving ? 'Guardando…' : existing ? 'Guardar cambios' : 'Guardar brigada'}</button>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>; }
