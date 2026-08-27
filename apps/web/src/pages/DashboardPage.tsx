import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, ClipboardCheck, ClipboardPlus, Search, ShieldPlus, UserPlus, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PERMISSIONS, type DashboardData, type PermissionCode } from '@socialapp/shared';
import { useAuth } from '../features/auth/useAuth';
import { loadAthletes } from '../features/athletes/athlete-repository';
import { usePendingCount } from '../hooks/usePendingCount';
import { api } from '../lib/api';

const actions = [
  { label: 'Consultar deportistas', icon: Search, to: '/deportistas', permission: PERMISSIONS.ATHLETE_READ },
  { label: 'Nuevo deportista', icon: UserPlus, to: '/deportistas/nuevo', permission: PERMISSIONS.ATHLETE_WRITE },
  { label: 'Nueva ficha social', icon: ClipboardPlus, to: '/trabajo-social', permission: PERMISSIONS.SOCIAL_RECORD_WRITE },
  { label: 'Iniciar tamizaje', icon: ShieldPlus, to: '/brigadas', permission: PERMISSIONS.SCREENING_WRITE },
  { label: 'Registrar seguimiento', icon: CalendarClock, to: '/trabajo-social', permission: PERMISSIONS.FOLLOW_UP_WRITE },
];

export function DashboardPage() {
  const { user, can } = useAuth();
  const { count } = usePendingCount();
  const [population, setPopulation] = useState({ total: 0, withRecord: 0 });
  const [dashboard, setDashboard] = useState<DashboardData>();
  const firstName = user?.displayName.split(' ')[0] ?? 'Profesional';
  const canViewSocialWork = can(PERMISSIONS.SOCIAL_RECORD_READ);
  const canViewDashboard = can(PERMISSIONS.DASHBOARD_AGGREGATE_READ);
  const visibleActions = actions.filter((action) => can(action.permission as PermissionCode));
  useEffect(() => {
    const refresh = async () => {
      const athletes = await loadAthletes();
      setPopulation({ total: athletes.length, withRecord: athletes.filter((athlete) => athlete.hasSocialRecord).length });
      if (navigator.onLine && canViewDashboard) api.dashboard().then(setDashboard).catch(() => undefined);
    };
    void refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [canViewDashboard]);
  const stats = [
    { label: 'Deportistas registrados', value: String(population.total), note: 'Población en este dispositivo', icon: UsersRound, tone: 'bg-pine-50 text-pine-700' },
    ...(canViewSocialWork ? [
      { label: 'Fichas pendientes', value: String(population.total - population.withRecord), note: `${population.withRecord} fichas realizadas`, icon: ClipboardCheck, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Seguimientos abiertos', value: String(dashboard?.openFollowUps ?? 0), note: `${dashboard?.highPriorityFollowUps ?? 0} de prioridad alta`, icon: CalendarClock, tone: 'bg-blue-50 text-blue-700' },
      { label: 'Alertas por revisar', value: String(dashboard?.pendingAlerts ?? 0), note: 'Pendientes de valoración profesional', icon: AlertTriangle, tone: 'bg-coral-100 text-coral-600' },
    ] : []),
  ];

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-pine-800 px-6 py-8 text-white md:px-10 md:py-10">
        <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full border-[45px] border-white/5" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div><p className="text-sm font-medium text-pine-100">Mi trabajo hoy</p><h1 className="mt-1 font-display text-4xl md:text-5xl">Buenos días, {firstName}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-pine-100">Todo está listo para organizar tu jornada. La fundación técnica ya puede trabajar sin conexión.</p></div>
          <div className="relative rounded-2xl bg-white/10 p-4 backdrop-blur"><p className="text-xs uppercase tracking-wider text-pine-100">Por sincronizar</p><p className="mt-1 text-3xl font-bold">{count}</p></div>
        </div>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon, tone }) => <article key={label} className="card p-5"><div className={`mb-5 grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon size={21} /></div><p className="text-3xl font-bold text-pine-900">{value}</p><h2 className="mt-2 text-sm font-semibold text-slate-700">{label}</h2><p className="mt-1 text-xs text-slate-400">{note}</p></article>)}
      </section>

      <section className={`mt-7 grid gap-6 ${canViewDashboard ? 'xl:grid-cols-[1.4fr_.8fr]' : ''}`}>
        <article className="card p-6 md:p-7">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-coral-600">Accesos rápidos</p><h2 className="mt-1 font-display text-2xl text-pine-900">¿Qué necesitas hacer?</h2></div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{visibleActions.map(({ label, icon: Icon, to }) => <Link key={label} to={to} className="group rounded-2xl border border-slate-100 bg-sand-50 p-5 transition hover:-translate-y-0.5 hover:border-pine-100 hover:shadow-soft"><Icon className="text-pine-600" size={25} /><p className="mt-8 font-semibold text-pine-900">{label}</p><ArrowRight className="mt-2 text-slate-400 transition group-hover:translate-x-1 group-hover:text-coral-500" size={18} /></Link>)}</div>
        </article>

        {canViewDashboard && <article className="card p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.14em] text-coral-600">Próximos seguimientos</p><h2 className="mt-1 font-display text-2xl text-pine-900">Agenda cercana</h2><div className="mt-6 space-y-3">{!dashboard?.upcomingFollowUps.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center"><CalendarClock className="mx-auto text-slate-300" size={34}/><p className="mt-3 text-sm text-slate-500">No hay acciones próximas.</p></div>}{dashboard?.upcomingFollowUps.map((item) => <Link key={item.id} to={`/deportistas/${item.athleteId}/trabajo-social`} className="block rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-coral-600">{new Date(item.date).toLocaleDateString('es-CO')}</p><p className="mt-1 text-sm font-semibold text-pine-900">{item.athleteName}</p><p className="text-xs text-slate-500">{item.motive}</p></Link>)}</div></article>}
      </section>

      <section className="mt-7 card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-pine-50 text-pine-700"><Search /></div><div><p className="font-semibold text-pine-900">Búsqueda rápida de deportistas</p><p className="text-sm text-slate-500">Busca por nombre, documento, código, programa o deporte.</p></div></div><Link to="/deportistas" className="btn-secondary">Buscar deportista <ArrowRight size={17} /></Link></section>
    </div>
  );
}
