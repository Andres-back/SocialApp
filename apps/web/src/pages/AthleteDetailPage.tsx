import { useEffect, useState } from 'react';
import { Activity, ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ClipboardEdit, Edit3, GraduationCap, Home, MapPin, Network, Phone, RefreshCw, ShieldAlert, Trash2, UserRound, UsersRound } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PERMISSIONS, screeningAgeGroup, type AthleteRecord } from '@socialapp/shared';
import { useAuth } from '../features/auth/useAuth';
import { deleteAthleteOnline, loadAthlete, loadSocialRecord } from '../features/athletes/athlete-repository';
import { loadWorkspace } from '../features/work/work-repository';
import type { AthleteWorkspace } from '@socialapp/shared';

const sexLabels = { FEMALE: 'Femenino', MALE: 'Masculino', INTERSEX: 'Intersexual', OTHER: 'Otro', PREFER_NOT_TO_SAY: 'Prefiere no responder' };
const statusLabels = { ACTIVE: 'Activo', RETIRED: 'Retirado', SUSPENDED: 'Suspendido', OTHER: 'Otro' };

export function AthleteDetailPage() {
  const { can } = useAuth();
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState<AthleteRecord | undefined>();
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<AthleteWorkspace>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  useEffect(() => {
    void (async () => {
      try {
        const athleteData = await loadAthlete(id);
        if (!athleteData) {
          setAthlete(undefined);
          return;
        }
        const canLoadRelatedData = !navigator.onLine || !athleteData.syncStatus || athleteData.syncStatus === 'synced';
        const [socialRecord, work] = canLoadRelatedData
          ? await Promise.all([
              can(PERMISSIONS.SOCIAL_RECORD_READ) ? loadSocialRecord(id) : Promise.resolve(undefined),
              can(PERMISSIONS.FOLLOW_UP_READ) ? loadWorkspace(id) : Promise.resolve(undefined),
            ])
          : [undefined, undefined];
        setWorkspace(work);
        setAthlete(socialRecord
          ? { ...athleteData, hasSocialRecord: true, socialRecordUpdatedAt: socialRecord.updatedAt }
          : athleteData);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, can]);
  if (loading) return <div className="p-12 text-center text-sm text-slate-500">Abriendo expediente…</div>;
  if (!athlete) return <div className="card p-10 text-center"><h1 className="text-xl font-bold text-pine-900">No encontramos este expediente</h1><Link to="/deportistas" className="btn-secondary mt-6">Volver a deportistas</Link></div>;
  const message = (location.state as { message?: string } | null)?.message;
  async function removeAthlete() {
    if (!window.confirm(`¿Retirar a ${athlete!.firstNames} ${athlete!.lastNames}? Dejará de aparecer en la población activa, pero el historial quedará conservado para auditoría.`)) return;
    setDeleting(true); setDeleteError('');
    try {
      await deleteAthleteOnline(athlete!.id);
      navigate('/deportistas', { replace: true, state: { message: 'Deportista retirado correctamente.' } });
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : 'No fue posible retirar el deportista.');
      setDeleting(false);
    }
  }
  return (
    <div>
      <Link to="/deportistas" className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17} /> Deportistas</Link>
      {message && <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={19} /> {message}</div>}
      {deleteError && <div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</div>}
      <section className="relative mt-5 overflow-hidden rounded-3xl bg-pine-800 p-6 text-white md:p-9">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[45px] border-white/5" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5"><div className="grid h-20 w-20 place-items-center rounded-3xl bg-white/10 font-display text-3xl">{athlete.firstNames[0]}{athlete.lastNames[0]}</div><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">{statusLabels[athlete.status]}</span>{athlete.syncStatus && athlete.syncStatus !== 'synced' && <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-3 py-1 text-xs text-amber-100"><RefreshCw size={12} /> Pendiente de sincronizar</span>}</div><h1 className="mt-3 font-display text-4xl">{athlete.firstNames} {athlete.lastNames}</h1><p className="mt-2 text-sm text-pine-100">{athlete.age} años · {athlete.sportName} · {athlete.sportsProgramName}</p></div></div>
          {can(PERMISSIONS.ATHLETE_WRITE) && <div className="flex flex-wrap gap-2"><Link to={`/deportistas/${athlete.id}/editar`} className="btn-secondary"><Edit3 size={17} /> Editar datos</Link><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50" disabled={deleting} onClick={() => void removeAthlete()}><Trash2 size={17}/>{deleting ? 'Retirando…' : 'Eliminar'}</button></div>}
        </div>
      </section>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <div className="space-y-6">
          <InfoSection title="Información básica" icon={<UserRound />}>
            <Item label="Código" value={athlete.internalCode} /><Item label="Documento" value={athlete.documentNumber || 'No registrado'} /><Item label="Sexo" value={sexLabels[athlete.sex]} /><Item label="Nacimiento" value={athlete.birthDate} /><Item label="Municipio" value={athlete.municipality} /><Item label="Zona" value={athlete.zone === 'URBAN' ? 'Urbana' : 'Rural'} />
          </InfoSection>
          <InfoSection title="Información deportiva" icon={<CalendarDays />}>
            <Item label="Programa" value={athlete.sportsProgramName} /><Item label="Deporte" value={athlete.sportName} /><Item label="Categoría" value={athlete.categoryName} /><Item label="Entrenador" value={athlete.coachName || 'Sin asignar'} /><Item label="Fecha de ingreso" value={athlete.joinedAt} />
          </InfoSection>
          <InfoSection title="Educación y acudiente" icon={<GraduationCap />}>
            <Item label="Escolarizado" value={athlete.currentlyEnrolled ? 'Sí' : 'No'} /><Item label="Institución" value={athlete.schoolName || 'No registrada'} /><Item label="Grado / jornada" value={[athlete.schoolGrade, athlete.schoolShift].filter(Boolean).join(' · ') || 'No registrado'} /><Item label="Acudiente" value={athlete.guardian.name} /><Item label="Parentesco" value={athlete.guardian.relationship} /><Item label="Teléfono" value={athlete.guardian.phone} />
          </InfoSection>
        </div>
        {can(PERMISSIONS.SOCIAL_RECORD_READ) && <aside className="space-y-6">
          <Link to={`/reportes/deportistas/${athlete.id}`} className="btn-secondary w-full">Ver reporte individual</Link>
          <section className="card p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.14em] text-coral-600">Trabajo Social</p><h2 className="mt-2 font-display text-3xl text-pine-900">Ficha social</h2><div className={`mt-5 rounded-2xl p-5 ${athlete.hasSocialRecord ? 'bg-emerald-50' : 'bg-amber-50'}`}>{athlete.hasSocialRecord ? <><BookOpen className="text-emerald-700" /><p className="mt-3 font-semibold text-emerald-900">Ficha registrada</p><p className="mt-1 text-xs text-emerald-700">Última actualización: {athlete.socialRecordUpdatedAt ? new Date(athlete.socialRecordUpdatedAt).toLocaleDateString('es-CO') : 'reciente'}</p></> : <><ShieldAlert className="text-amber-700" /><p className="mt-3 font-semibold text-amber-900">Ficha pendiente</p><p className="mt-1 text-xs leading-5 text-amber-700">Completa la composición familiar y las redes de apoyo.</p></>}</div><Link to={`/deportistas/${athlete.id}/ficha-social`} className="btn-primary mt-5 w-full"><ClipboardEdit size={18} /> {athlete.hasSocialRecord ? 'Ver o actualizar ficha' : 'Crear ficha social'}</Link></section>
          <section className="card p-6"><h2 className="font-semibold text-pine-900">Contacto rápido</h2><p className="mt-4 flex items-center gap-3 text-sm text-slate-600"><Phone size={18} className="text-pine-600" /> {athlete.guardian.phone}</p><p className="mt-3 flex items-center gap-3 text-sm text-slate-600"><MapPin size={18} className="text-pine-600" /> {athlete.municipality}</p></section>
        </aside>}
      </div>
      {(can(PERMISSIONS.FOLLOW_UP_READ) || can(PERMISSIONS.SCREENING_WRITE)) && <section className="mt-6"><h2 className="font-display text-3xl text-pine-900">Expediente social</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can(PERMISSIONS.FOLLOW_UP_READ) && <><ModuleLink to={`/deportistas/${athlete.id}/caracterizacion`} icon={<Home/>} title="Caracterización" status={workspace?.socioeconomicAssessment ? 'Realizada' : 'Pendiente'} />
        <ModuleLink to={`/deportistas/${athlete.id}/trabajo-social`} icon={<Activity/>} title="Alertas y seguimientos" status={`${workspace?.alerts.filter((item) => item.status === 'PENDING').length ?? 0} alertas · ${workspace?.followUps.filter((item) => item.status !== 'CLOSED').length ?? 0} abiertos`} />
        <ModuleLink to={`/deportistas/${athlete.id}/familiograma`} icon={<UsersRound/>} title="Familiograma" status={workspace?.genogram ? 'Guardado' : 'Generar'} />
        <ModuleLink to={`/deportistas/${athlete.id}/ecomapa`} icon={<Network/>} title="Ecomapa" status={workspace?.ecomap ? 'Guardado' : 'Generar'} /></>}
        {can(PERMISSIONS.SCREENING_WRITE) && (screeningAgeGroup(athlete.age)
          ? <ModuleLink to={`/brigadas/nueva?athleteId=${athlete.id}`} icon={<ShieldAlert/>} title="Tamizaje por edad" status={`${screeningAgeGroup(athlete.age)} · Preparar brigada`} />
          : <ModuleCard icon={<ShieldAlert/>} title="Tamizaje por edad" status={`No disponible para ${athlete.age} años`} />)}
      </div></section>}
    </div>
  );
}

function InfoSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="card p-6 md:p-7"><div className="flex items-center gap-3 text-pine-800">{icon}<h2 className="font-display text-2xl">{title}</h2></div><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div></section>;
}
function Item({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-700">{value}</p></div>; }
function ModuleLink({ to, icon, title, status }: { to: string; icon: React.ReactNode; title: string; status: string }) { return <Link to={to} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="grid h-11 w-11 place-items-center rounded-xl bg-pine-50 text-pine-700">{icon}</div><div><p className="font-semibold text-pine-900">{title}</p><p className="mt-1 text-xs text-slate-500">{status}</p></div></Link>; }
function ModuleCard({ icon, title, status }: { icon: React.ReactNode; title: string; status: string }) { return <div className="card flex items-center gap-4 p-5 opacity-70"><div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500">{icon}</div><div><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-500">{status}</p></div></div>; }
