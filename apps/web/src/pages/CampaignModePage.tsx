import { ArrowLeft, CheckCircle2, Circle, ClipboardCheck, Edit3, LockKeyhole, MapPin, Play, Printer, RotateCcw, Search, Sparkles, Trash2, UsersRound, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PERMISSIONS, type CampaignAiReportData, type ScreeningCampaignData, type ScreeningParticipantStatus } from '@socialapp/shared';
import { useAuth } from '../features/auth/useAuth';
import { changeCampaignStatusOffline, deleteCampaignOnline, loadCampaigns } from '../features/work/work-repository';
import { useConnection } from '../hooks/useConnection';
import { api } from '../lib/api';

const participantLabels: Record<ScreeningParticipantStatus, string> = { PENDING: 'Pendiente', IN_PROGRESS: 'En proceso', COMPLETED: 'Completado' };

export function CampaignModePage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const navigate = useNavigate();
  const online = useConnection();
  const [item, setItem] = useState<ScreeningCampaignData>();
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | ScreeningParticipantStatus>('ALL');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState<CampaignAiReportData[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  useEffect(() => { setLoaded(false); loadCampaigns().then((items) => setItem(items.find((campaign) => campaign.id === id))).finally(() => setLoaded(true)); }, [id, online]);
  useEffect(() => { if (online) api.listCampaignAiReports(id).then(setReports).catch(() => undefined); }, [id, online]);
  const visible = useMemo(() => {
    if (!item) return [];
    const term = search.trim().toLocaleLowerCase('es');
    return item.participants.filter((person) => (status === 'ALL' || person.status === status) && (!term || person.athleteName.toLocaleLowerCase('es').includes(term)));
  }, [item, search, status]);
  if (!item) return loaded
    ? <div className="card p-10 text-center"><h1 className="font-display text-3xl text-pine-900">Esta brigada ya no está disponible</h1><p className="mt-2 text-sm text-slate-500">Pudo ser eliminada por otra persona. La lista local ya fue actualizada.</p><Link to="/brigadas" className="btn-primary mt-6">Volver a brigadas</Link></div>
    : <div className="p-12 text-center text-sm text-slate-500">Preparando modo brigada…</div>;
  const completed = item.participants.filter((person) => person.status === 'COMPLETED').length;
  const inProgress = item.participants.filter((person) => person.status === 'IN_PROGRESS').length;
  const canWrite = can(PERMISSIONS.SCREENING_WRITE);

  async function transition() {
    setError('');
    const next = item!.status === 'PLANNED' ? 'ACTIVE' : item!.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE';
    if (next === 'COMPLETED' && completed !== item!.participants.length) return setError('Completa todos los tamizajes antes de cerrar la brigada.');
    setSaving(true);
    try { setItem(await changeCampaignStatusOffline(item!, next)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible cambiar el estado.'); }
    finally { setSaving(false); }
  }

  async function removeCampaign() {
    if (!window.confirm(`¿Eliminar la brigada “${item!.name}”? Dejará de aparecer en la operación, pero sus resultados se conservarán para auditoría.`)) return;
    setSaving(true); setError('');
    try {
      await deleteCampaignOnline(item!.id);
      navigate('/brigadas', { replace: true, state: { message: 'Brigada eliminada correctamente.' } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible eliminar la brigada.');
      setSaving(false);
    }
  }

  async function generateCampaignReport() {
    setGeneratingReport(true); setError('');
    try { const report = await api.generateCampaignAiReport(item!.id); setReports((current) => [report, ...current.filter((value) => value.id !== report.id)]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible generar el informe de la brigada.'); }
    finally { setGeneratingReport(false); }
  }

  async function printReport() { await api.auditExport('CampaignAiReport').catch(() => undefined); window.print(); }

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/brigadas" className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Todas las brigadas</Link>{!online && <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><WifiOff size={14}/> Modo sin conexión</span>}</div>
    <header className="mt-5 rounded-3xl bg-pine-800 p-6 text-white md:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Modo Brigada · {item.status === 'PLANNED' ? 'Planeada' : item.status === 'ACTIVE' ? 'En curso' : 'Finalizada'}</span>{item.syncStatus && item.syncStatus !== 'synced' && <span className="rounded-full bg-amber-300/20 px-3 py-1 text-xs text-amber-100">{item.syncStatus === 'pending' ? 'Pendiente de sincronizar' : item.syncStatus === 'conflict' ? 'Conflicto de sincronización' : 'Error de sincronización'}</span>}</div><h1 className="mt-3 font-display text-4xl">{item.name}</h1><p className="mt-3 flex items-center gap-2 text-sm text-pine-100"><MapPin size={17}/>{item.place} · {item.date}</p><p className="mt-2 text-xs text-pine-200">{item.sportsProgramName || 'Todos los programas'} · {item.sportName || 'Todos los deportes'} · {item.professionalName}</p><p className="mt-1 text-xs text-pine-200">{item.instrument.name} v{item.instrument.version}</p></div>
        {canWrite && <div className="flex flex-wrap gap-2 print:hidden"><Link to={`/brigadas/${item.id}/editar`} className="btn-secondary"><Edit3 size={16}/> Editar</Link><button className="btn-secondary" disabled={saving} onClick={() => void transition()}>{item.status === 'PLANNED' ? <><Play size={16}/> Iniciar jornada</> : item.status === 'ACTIVE' ? <><LockKeyhole size={16}/> Cerrar jornada</> : <><RotateCcw size={16}/> Reabrir</>}</button><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50" disabled={saving} onClick={() => void removeCampaign()}><Trash2 size={16}/> Eliminar</button></div>}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini value={item.participants.length} label="Total"/><Mini value={item.participants.length-completed-inProgress} label="Pendientes"/><Mini value={inProgress} label="En proceso"/><Mini value={completed} label="Completados"/></div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-300" style={{ width: `${item.participants.length ? completed / item.participants.length * 100 : 0}%` }}/></div>
    </header>
    {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="card mt-6 p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Análisis agregado</p><h2 className="mt-1 font-display text-3xl text-pine-900">Informe de IA de la brigada</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Genera resultados generales, observaciones y recomendaciones a partir de conteos agregados. No se envían nombres, datos demográficos, textos libres ni respuestas individuales.</p></div><div className="flex flex-wrap gap-2 print:hidden"><button className="btn-secondary" disabled={!online || completed < 5 || generatingReport} onClick={() => void generateCampaignReport()}><Sparkles size={17}/>{generatingReport ? 'Generando…' : reports.length ? 'Generar nueva versión' : 'Generar informe'}</button>{reports.length > 0 && <button className="btn-primary" onClick={() => void printReport()}><Printer size={17}/> Imprimir informe</button>}</div></div>
      {completed < 5 && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 print:hidden">Se requieren al menos cinco tamizajes completados para proteger la privacidad del grupo. Actualmente hay {completed}.</div>}
      {reports.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Todavía no hay un informe generado para esta brigada.</div> : <div className="mt-6 space-y-6">{reports.map((report, index) => <article key={report.id} className={`${index > 0 ? 'print:hidden' : ''} rounded-2xl border border-slate-200 p-5 md:p-6`}><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-pine-50 px-3 py-1 text-xs font-bold text-pine-700">{index === 0 ? 'Informe más reciente' : 'Versión anterior'}</span><span className="text-xs text-slate-400">{new Date(report.generatedAt).toLocaleString('es-CO')}</span></div><ReportBlock title="Resultados generales"><p>{report.generalResults}</p></ReportBlock><ReportBlock title="Observaciones"><BulletList items={report.observations}/></ReportBlock><ReportBlock title="Recomendaciones"><BulletList items={report.recommendations}/></ReportBlock><ReportBlock title="Limitaciones"><p>{report.limitations}</p></ReportBlock><p className="mt-5 text-xs text-slate-400">Borrador asistido por IA. Requiere validación profesional y no constituye diagnóstico.</p></article>)}</div>}
    </section>
    <section className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_220px] print:hidden"><label className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><span className="sr-only">Buscar participante</span><input className="field pl-11" placeholder="Buscar participante…" value={search} onChange={(event) => setSearch(event.target.value)}/></label><select aria-label="Filtrar participantes por estado" className="field" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="ALL">Todos los estados</option><option value="PENDING">Pendientes</option><option value="IN_PROGRESS">En proceso</option><option value="COMPLETED">Completados</option></select></section>
    <div className="mt-4 space-y-3 print:hidden">{visible.map((person) => {
      const resultRoute = `/brigadas/${item.id}/resultados/${person.athleteId}`;
      const formRoute = `/brigadas/${item.id}/deportistas/${person.athleteId}`;
      return <article key={person.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{person.status === 'COMPLETED' ? <CheckCircle2 className="text-emerald-600"/> : person.status === 'IN_PROGRESS' ? <ClipboardCheck className="text-amber-600"/> : <Circle className="text-slate-300"/>}<div><p className="font-semibold text-pine-900">{person.athleteName}</p><p className="text-xs text-slate-500">{participantLabels[person.status]}{person.syncStatus && person.syncStatus !== 'synced' ? ' · Cambio local pendiente' : ''}</p></div></div><div className="flex gap-2">{person.status === 'COMPLETED' ? <Link to={resultRoute} className="btn-secondary min-h-10 px-3 py-2"><ClipboardCheck size={16}/> Ver resultado</Link> : canWrite && item.status === 'ACTIVE' ? <Link to={formRoute} className="btn-primary min-h-10 px-3 py-2"><Play size={16}/>{person.status === 'IN_PROGRESS' ? 'Continuar' : 'Aplicar'}</Link> : <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">{item.status === 'PLANNED' ? 'Jornada no iniciada' : 'Solo consulta'}</span>}</div></article>;
    })}</div>
    {item.participants.length === 0 ? <div className="card mt-4 flex flex-col items-center p-10 text-center"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-pine-50 text-pine-700"><UsersRound size={25}/></span><h2 className="mt-4 font-display text-2xl text-pine-900">Brigada lista para recibir población</h2><p className="mt-2 max-w-lg text-sm text-slate-500">Puedes conservarla vacía mientras organizas la jornada y añadir deportistas cuando estén confirmados.</p>{canWrite && <Link to={`/brigadas/${item.id}/editar`} className="btn-primary mt-5"><UsersRound size={17}/> Añadir deportistas</Link>}</div> : visible.length === 0 && <div className="card mt-4 p-10 text-center text-sm text-slate-500">No hay participantes que coincidan con el filtro.</div>}
  </div>;
}

function Mini({ value, label }: { value: number; label: string }) { return <div className="rounded-2xl bg-white/10 p-4 text-center"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-pine-100">{label}</p></div>; }
function ReportBlock({title,children}:{title:string;children:React.ReactNode}) { return <section className="mt-5 break-inside-avoid"><h3 className="font-display text-xl text-pine-900">{title}</h3><div className="mt-2 text-sm leading-6 text-slate-700">{children}</div></section>; }
function BulletList({items}:{items:string[]}) { return items.length ? <ul className="space-y-2">{items.map((item,index)=><li key={index} className="flex gap-2"><span className="text-coral-500">•</span><span>{item}</span></li>)}</ul> : <p>Sin elementos adicionales.</p>; }
