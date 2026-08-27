import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, ChevronRight, ClipboardCheck, Home, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AthleteRecord, DashboardData } from '@socialapp/shared';
import { loadAthletes } from '../features/athletes/athlete-repository';
import { api } from '../lib/api';

export function WorkOverviewPage() {
  const [dashboard, setDashboard] = useState<DashboardData>(); const [athletes, setAthletes] = useState<AthleteRecord[]>([]); const [search, setSearch] = useState('');
  useEffect(() => { loadAthletes().then(setAthletes); if (navigator.onLine) api.dashboard().then(setDashboard).catch(() => undefined); }, []);
  const visible = athletes.filter((item) => `${item.firstNames} ${item.lastNames} ${item.internalCode}`.toLowerCase().includes(search.toLowerCase()));
  return <div><div><p className="text-sm font-bold text-coral-600">Centro de trabajo</p><h1 className="font-display text-4xl text-pine-900">Trabajo Social</h1><p className="mt-2 text-sm text-slate-500">Encuentra pendientes y abre cualquier intervención desde el expediente.</p></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><Kpi icon={<AlertTriangle/>} value={dashboard?.pendingAlerts ?? 0} label="Alertas pendientes" tone="bg-amber-50 text-amber-700"/><Kpi icon={<CalendarClock/>} value={dashboard?.openFollowUps ?? 0} label="Seguimientos abiertos" tone="bg-blue-50 text-blue-700"/><Kpi icon={<ClipboardCheck/>} value={dashboard?.socioeconomicAssessments ?? 0} label="Caracterizaciones" tone="bg-emerald-50 text-emerald-700"/></div>
    <div className="card mt-6 p-5"><label className="relative block"><Search className="absolute left-4 top-3.5 text-slate-400" size={19}/><input className="field pl-11" placeholder="Buscar deportista para intervenir…" value={search} onChange={(e) => setSearch(e.target.value)}/></label><div className="mt-5 divide-y divide-slate-100">{visible.map((item) => <div key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-pine-900">{item.firstNames} {item.lastNames}</p><p className="mt-1 text-xs text-slate-500">{item.internalCode} · {item.sportName} · {item.sportsProgramName}</p></div><div className="flex flex-wrap gap-2"><Link className="btn-secondary min-h-10 px-3 py-2 text-xs" to={`/deportistas/${item.id}/caracterizacion`}><Home size={15}/> Caracterizar</Link><Link className="btn-primary min-h-10 px-3 py-2 text-xs" to={`/deportistas/${item.id}/trabajo-social`}>Intervenir <ChevronRight size={15}/></Link></div></div>)}</div></div>
  </div>;
}
function Kpi({ icon,value,label,tone }: { icon:React.ReactNode; value:number; label:string; tone:string }) { return <article className="card flex items-center gap-4 p-5"><div className={`grid h-12 w-12 place-items-center rounded-xl ${tone}`}>{icon}</div><div><p className="text-2xl font-bold text-pine-900">{value}</p><p className="text-xs text-slate-500">{label}</p></div></article>; }
