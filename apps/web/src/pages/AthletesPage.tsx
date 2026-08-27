import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardList, Plus, Search, UserRound, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PERMISSIONS, type AthleteRecord } from '@socialapp/shared';
import { loadAthletes } from '../features/athletes/athlete-repository';
import { useAuth } from '../features/auth/useAuth';
import { useConnection } from '../hooks/useConnection';

const statusLabels = { ACTIVE: 'Activo', RETIRED: 'Retirado', SUSPENDED: 'Suspendido', OTHER: 'Otro' };

export function AthletesPage({ socialWorkView = false }: { socialWorkView?: boolean }) {
  const { can } = useAuth();
  const canManageAthletes = can(PERMISSIONS.ATHLETE_WRITE);
  const canViewSocialRecord = can(PERMISSIONS.SOCIAL_RECORD_READ);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [allAthletes, setAllAthletes] = useState<AthleteRecord[]>([]);
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('');
  const [sport, setSport] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const online = useConnection();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      loadAthletes().then((items) => {
        setAllAthletes(items);
        const term = search.trim().toLocaleLowerCase('es');
        setAthletes(items.filter((item) => {
          const matchesSearch = !term || [item.firstNames, item.lastNames, item.internalCode, item.documentNumber ?? '', item.coachName ?? '', item.sportsProgramName, item.sportName, item.categoryName].some((value) => value.toLocaleLowerCase('es').includes(term));
          return matchesSearch && (!program || item.sportsProgramId === program) && (!sport || item.sportId === sport) && (!status || item.status === status);
        }));
      }).finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [search, program, sport, status, online]);

  return (
    <div>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-coral-600">{socialWorkView ? 'Control de población' : 'Expediente único'}</p>
          <h1 className="mt-1 font-display text-4xl text-pine-900">{socialWorkView ? 'Fichas sociales' : 'Deportistas'}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {socialWorkView ? 'Identifica quién ya tiene ficha y continúa los registros pendientes.' : canManageAthletes ? 'Registra, busca y consulta la población vinculada a los programas deportivos.' : 'Consulta la población deportiva asignada a tu perfil.'}
          </p>
        </div>
        {canManageAthletes && <Link to="/deportistas/nuevo" className="btn-primary"><Plus size={19} /> Nuevo deportista</Link>}
      </div>

      {!online && <div className="mt-6 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"><WifiOff size={19} /> Mostrando los deportistas guardados en este dispositivo.</div>}

      <section className="card mt-7 overflow-hidden">
        <div className="border-b border-slate-100 p-4 md:p-6">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <span className="sr-only">Buscar deportista</span>
            <input className="field pl-12" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, documento, código, entrenador, programa…" />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select aria-label="Filtrar por programa" className="field" value={program} onChange={(e) => setProgram(e.target.value)}><option value="">Todos los programas</option>{Array.from(new Map(allAthletes.map((item) => [item.sportsProgramId,item.sportsProgramName])).entries()).map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select>
            <select aria-label="Filtrar por deporte" className="field" value={sport} onChange={(e) => setSport(e.target.value)}><option value="">Todos los deportes</option>{Array.from(new Map(allAthletes.map((item) => [item.sportId,item.sportName])).entries()).map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select>
            <select aria-label="Filtrar por estado" className="field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Consultando deportistas…</div>
        ) : athletes.length === 0 ? (
          <div className="p-12 text-center"><UserRound className="mx-auto text-slate-300" size={40} /><h2 className="mt-4 font-semibold text-pine-900">No hay deportistas para mostrar</h2><p className="mt-1 text-sm text-slate-500">Registra el primero o cambia el texto de búsqueda.</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {athletes.map((athlete) => (
              <Link key={athlete.id} to={`/deportistas/${athlete.id}`} className="group grid gap-4 p-5 transition hover:bg-pine-50/50 md:grid-cols-[1.3fr_.9fr_.8fr_auto] md:items-center md:px-6">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pine-100 font-bold text-pine-700">{athlete.firstNames[0]}{athlete.lastNames[0]}</div>
                  <div><p className="font-semibold text-pine-900">{athlete.firstNames} {athlete.lastNames}</p><p className="mt-1 text-xs text-slate-500">{athlete.internalCode} · {athlete.age} años</p></div>
                </div>
                <div><p className="text-sm font-medium text-slate-700">{athlete.sportName}</p><p className="text-xs text-slate-500">{athlete.sportsProgramName}</p></div>
                {canViewSocialRecord && <div className="flex items-center gap-2">
                  {athlete.hasSocialRecord ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><ClipboardList size={13} /> Ficha realizada</span> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Ficha pendiente</span>}
                  {athlete.syncStatus && athlete.syncStatus !== 'synced' && <span className="h-2.5 w-2.5 rounded-full bg-amber-400" title="Pendiente de sincronizar" />}
                </div>}
                <div className="flex items-center justify-between md:justify-end"><span className="text-xs text-slate-400 md:hidden">{statusLabels[athlete.status]}</span><ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-coral-500" size={20} /></div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <p className="mt-4 text-right text-xs text-slate-400">{athletes.length} deportista{athletes.length === 1 ? '' : 's'} en la lista</p>
    </div>
  );
}
