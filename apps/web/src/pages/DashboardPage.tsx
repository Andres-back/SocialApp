import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, ClipboardPlus, Search, ShieldPlus, Sparkles, UserPlus, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PERMISSIONS, type DashboardData, type PermissionCode } from '@socialapp/shared';
import { useAuth } from '../features/auth/useAuth';
import { loadAthletes } from '../features/athletes/athlete-repository';
import { usePendingCount } from '../hooks/usePendingCount';
import { api } from '../lib/api';

const actions = [
  { label: 'Consultar deportistas', description: 'Busca y revisa expedientes', icon: Search, to: '/deportistas', permission: PERMISSIONS.ATHLETE_READ },
  { label: 'Nuevo deportista', description: 'Registra una nueva vinculación', icon: UserPlus, to: '/deportistas/nuevo', permission: PERMISSIONS.ATHLETE_WRITE },
  { label: 'Nueva ficha social', description: 'Completa información familiar', icon: ClipboardPlus, to: '/trabajo-social', permission: PERMISSIONS.SOCIAL_RECORD_WRITE },
  { label: 'Iniciar tamizaje', description: 'Trabaja una brigada en campo', icon: ShieldPlus, to: '/brigadas', permission: PERMISSIONS.SCREENING_WRITE },
  { label: 'Registrar seguimiento', description: 'Documenta una intervención', icon: CalendarClock, to: '/trabajo-social', permission: PERMISSIONS.FOLLOW_UP_WRITE },
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
  const today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

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
    { label: 'Deportistas registrados', value: String(population.total), note: 'Población activa en este dispositivo', icon: UsersRound, iconTone: 'bg-pine-50 text-pine-700', accent: 'bg-pine-500' },
    ...(canViewSocialWork ? [
      { label: 'Fichas pendientes', value: String(population.total - population.withRecord), note: `${population.withRecord} fichas realizadas`, icon: ClipboardCheck, iconTone: 'bg-amber-50 text-amber-700', accent: 'bg-amber-400' },
      { label: 'Seguimientos abiertos', value: String(dashboard?.openFollowUps ?? 0), note: `${dashboard?.highPriorityFollowUps ?? 0} de prioridad alta`, icon: CalendarClock, iconTone: 'bg-sky-50 text-sky-700', accent: 'bg-sky-400' },
      { label: 'Alertas por revisar', value: String(dashboard?.pendingAlerts ?? 0), note: 'Pendientes de valoración profesional', icon: AlertTriangle, iconTone: 'bg-coral-100 text-coral-600', accent: 'bg-coral-500' },
    ] : []),
  ];

  return (
    <div className="space-y-7">
      <section className="dashboard-hero relative overflow-hidden rounded-[28px] px-6 py-7 text-white shadow-xl shadow-pine-900/15 md:px-9 md:py-9">
        <div className="hero-grid absolute inset-0 opacity-30" />
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/[.06] blur-sm" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-pine-100">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur"><Sparkles size={14} /> Mi jornada</span>
              <span className="capitalize text-pine-100/80">{today}</span>
            </div>
            <h1 className="mt-5 font-display text-4xl leading-tight md:text-[3.25rem]">Hola, {firstName}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-pine-100 md:text-base">Tu espacio está listo para acompañar a cada deportista, organizar las fichas y continuar el trabajo incluso sin conexión.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {can(PERMISSIONS.ATHLETE_WRITE) && <Link to="/deportistas/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-pine-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-sand-50"><UserPlus size={18} /> Registrar deportista</Link>}
              {can(PERMISSIONS.SOCIAL_RECORD_WRITE) && <Link to="/trabajo-social" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"><ClipboardPlus size={18} /> Abrir ficha social</Link>}
            </div>
          </div>
          <Link to="/sincronizacion" className="group flex min-w-[230px] items-center gap-4 rounded-2xl border border-white/15 bg-pine-950/20 p-4 backdrop-blur-md transition hover:bg-pine-950/30">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-400/15 text-emerald-200"><CheckCircle2 size={24} /></span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[.16em] text-pine-100/70">Sincronización</span>
              <span className="mt-1 block text-sm font-semibold">{count === 0 ? 'Todo está al día' : `${count} pendiente${count === 1 ? '' : 's'}`}</span>
            </span>
            <ArrowRight className="ml-auto text-pine-100/60 transition group-hover:translate-x-1" size={18} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de indicadores">
        {stats.map(({ label, value, note, icon: Icon, iconTone, accent }) => (
          <article key={label} className="card group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
            <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
            <div className="flex items-start justify-between">
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${iconTone}`}><Icon size={20} /></div>
              <ArrowRight className="text-slate-200 transition group-hover:translate-x-1 group-hover:text-pine-400" size={18} />
            </div>
            <p className="mt-5 text-[2rem] font-extrabold leading-none tracking-tight text-pine-900">{value}</p>
            <h2 className="mt-2.5 text-sm font-bold text-slate-700">{label}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">{note}</p>
          </article>
        ))}
      </section>

      <section className={`grid gap-6 ${canViewDashboard ? 'xl:grid-cols-[1.45fr_.75fr]' : ''}`}>
        <article className="card p-6 md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow">Acciones frecuentes</p><h2 className="mt-1 font-display text-2xl text-pine-900">¿Qué necesitas hacer?</h2></div>
            <p className="text-xs text-slate-400">Accesos rápidos de tu jornada</p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {visibleActions.map(({ label, description, icon: Icon, to }) => (
              <Link key={label} to={to} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-sand-50/70 p-4 transition hover:border-pine-100 hover:bg-pine-50/60 hover:shadow-sm">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-pine-600 shadow-sm transition group-hover:bg-pine-700 group-hover:text-white"><Icon size={21} /></span>
                <span className="min-w-0"><span className="block text-sm font-bold text-pine-900">{label}</span><span className="mt-0.5 block text-xs text-slate-400">{description}</span></span>
                <ArrowRight className="ml-auto shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-coral-500" size={17} />
              </Link>
            ))}
          </div>
        </article>

        {canViewDashboard && (
          <article className="card p-6 md:p-7">
            <p className="eyebrow">Próximos seguimientos</p>
            <h2 className="mt-1 font-display text-2xl text-pine-900">Agenda cercana</h2>
            <div className="mt-6 space-y-3">
              {!dashboard?.upcomingFollowUps.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-9 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-slate-300 shadow-sm"><CalendarClock size={24} /></span><p className="mt-3 text-sm font-semibold text-slate-600">Agenda despejada</p><p className="mt-1 text-xs leading-5 text-slate-400">No hay acciones próximas programadas.</p></div>}
              {dashboard?.upcomingFollowUps.map((item) => <Link key={item.id} to={`/deportistas/${item.athleteId}/trabajo-social`} className="block rounded-xl border border-transparent bg-slate-50 p-4 transition hover:border-pine-100 hover:bg-pine-50"><p className="text-xs font-bold text-coral-600">{new Date(item.date).toLocaleDateString('es-CO')}</p><p className="mt-1 text-sm font-semibold text-pine-900">{item.athleteName}</p><p className="text-xs text-slate-500">{item.motive}</p></Link>)}
            </div>
          </article>
        )}
      </section>

      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pine-50 text-pine-700"><Search size={21} /></div><div><p className="font-bold text-pine-900">Encuentra un deportista</p><p className="mt-0.5 text-sm text-slate-500">Busca por nombre, documento, código, programa o deporte.</p></div></div>
        <Link to="/deportistas" className="btn-secondary shrink-0">Ir al directorio <ArrowRight size={17} /></Link>
      </section>
    </div>
  );
}
