import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CloudOff, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useConnection } from '../hooks/useConnection';
import { usePendingCount } from '../hooks/usePendingCount';
import { discardSyncIssue, listSyncIssues, retrySyncIssue, synchronize, type SyncIssue } from '../lib/sync-engine';

const entityLabels: Record<string, string> = {
  athlete: 'Deportista',
  'social-record': 'Ficha social',
  'socioeconomic-assessment': 'Caracterización',
  alert: 'Alerta',
  'follow-up': 'Seguimiento',
  'follow-up-entry': 'Nota de seguimiento',
  observation: 'Observación',
  genogram: 'Familiograma',
  ecomap: 'Ecomapa',
  campaign: 'Brigada',
  'screening-result': 'Resultado de tamizaje',
};

export function SyncPage() {
  const online = useConnection();
  const { count, refresh } = usePendingCount();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [issues, setIssues] = useState<SyncIssue[]>([]);

  async function refreshIssues() { setIssues(await listSyncIssues()); }
  useEffect(() => { void refreshIssues(); }, [count]);

  async function run() {
    setRunning(true); setMessage('');
    try { const result = await synchronize(); setMessage(result.synced > 0 ? `Sincronización completada: ${result.synced} cambio${result.synced === 1 ? '' : 's'} enviado${result.synced === 1 ? '' : 's'}.` : 'Sincronización completada. No había cambios nuevos para enviar.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible sincronizar.'); }
    finally { setRunning(false); refresh(); void refreshIssues(); }
  }
  async function retry(issue: SyncIssue) {
    await retrySyncIssue(issue.mutationId);
    await run();
  }
  async function discard(issue: SyncIssue) {
    if (!window.confirm('¿Descartar este cambio local? Se conservará la versión que ya existe en el servidor.')) return;
    await discardSyncIssue(issue.mutationId);
    refresh(); await refreshIssues();
    setMessage('Cambio local descartado. Al volver al módulo se cargará la versión del servidor.');
  }

  return <div className="mx-auto max-w-4xl"><p className="text-sm font-semibold text-coral-600">Estado del dispositivo</p><h1 className="mt-1 font-display text-4xl text-pine-900">Sincronización</h1><p className="mt-3 max-w-2xl text-slate-500">Tus registros permanecen en este dispositivo hasta recibir confirmación segura del servidor.</p>
    <section className="card mt-8 overflow-hidden"><div className={`flex items-start gap-4 p-6 md:p-8 ${online ? 'bg-emerald-50' : 'bg-amber-50'}`}>{online ? <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" /> : <CloudOff className="mt-1 shrink-0 text-amber-600" />}<div><h2 className="text-lg font-bold text-pine-900">{online ? 'Con conexión' : 'Trabajando sin conexión'}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{online ? 'Puedes enviar los cambios guardados y recibir actualizaciones autorizadas.' : 'Puedes continuar trabajando. Intentaremos sincronizar automáticamente cuando vuelva internet.'}</p></div></div>
      <div className="grid gap-6 p-6 md:grid-cols-3 md:p-8"><div><p className="text-sm text-slate-500">Pendientes</p><p className="mt-1 text-4xl font-bold text-pine-900">{count}</p></div><div><p className="text-sm text-slate-500">Con errores</p><p className="mt-1 text-4xl font-bold text-pine-900">{issues.filter((item) => item.status === 'error').length}</p></div><div><p className="text-sm text-slate-500">Conflictos</p><p className="mt-1 text-4xl font-bold text-pine-900">{issues.filter((item) => item.status === 'conflict').length}</p></div></div>
      <div className="border-t border-slate-100 p-6 md:flex md:items-center md:justify-between md:p-8"><div className="mb-4 flex items-center gap-3 text-sm text-slate-500 md:mb-0"><ShieldCheck className="text-pine-600" /> Nada se elimina antes de ser confirmado.</div><button className="btn-primary" disabled={running || !online} onClick={() => void run()}><RefreshCw className={running ? 'animate-spin' : ''} size={18} />{running ? 'Sincronizando…' : 'Sincronizar ahora'}</button></div>
    </section>
    {message && <div className="mt-5 flex items-start gap-3 rounded-xl bg-white p-4 text-sm text-slate-700 shadow-sm"><AlertCircle className="shrink-0 text-coral-500" size={20} /><span>{message}</span></div>}
    {issues.length > 0 && <section className="mt-7"><div><p className="text-sm font-bold text-coral-600">Requieren atención</p><h2 className="mt-1 font-display text-3xl text-pine-900">Cambios que no pudieron enviarse</h2><p className="mt-2 text-sm text-slate-500">Aquí puedes ver el motivo exacto. Los errores de conexión se pueden reintentar; los cambios rechazados o en conflicto pueden descartarse para conservar la versión del servidor.</p></div><div className="mt-4 space-y-3">{issues.map((issue) => <article key={issue.mutationId} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${issue.status === 'conflict' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{issue.status === 'conflict' ? 'Conflicto' : 'Error'}</span><span className="text-sm font-bold text-pine-900">{entityLabels[issue.entityType] ?? issue.entityType}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{issue.message}</p><p className="mt-1 text-xs text-slate-400">{issue.attempts} intento{issue.attempts === 1 ? '' : 's'}</p></div><div className="flex shrink-0 flex-wrap gap-2">{issue.recoverable && <button className="btn-secondary min-h-10 px-3 py-2" disabled={running || !online} onClick={() => void retry(issue)}><RefreshCw size={16}/> Reintentar</button>}<button className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50" onClick={() => void discard(issue)}><Trash2 size={16}/> Descartar cambio local</button></div></article>)}</div></section>}
  </div>;
}
