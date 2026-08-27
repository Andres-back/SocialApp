import { useState } from 'react';
import { AlertCircle, CheckCircle2, CloudOff, RefreshCw, ShieldCheck } from 'lucide-react';
import { useConnection } from '../hooks/useConnection';
import { usePendingCount } from '../hooks/usePendingCount';
import { synchronize, type SyncSummary } from '../lib/sync-engine';

export function SyncPage() {
  const online = useConnection();
  const { count, refresh } = usePendingCount();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  async function run() {
    setRunning(true); setMessage('');
    try { const result = await synchronize(); setSummary(result); setMessage('Sincronización completada.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible sincronizar.'); }
    finally { setRunning(false); refresh(); }
  }

  return <div className="mx-auto max-w-4xl"><p className="text-sm font-semibold text-coral-600">Estado del dispositivo</p><h1 className="mt-1 font-display text-4xl text-pine-900">Sincronización</h1><p className="mt-3 max-w-2xl text-slate-500">Tus registros permanecen en este dispositivo hasta recibir confirmación segura del servidor.</p>
    <section className="card mt-8 overflow-hidden"><div className={`flex items-start gap-4 p-6 md:p-8 ${online ? 'bg-emerald-50' : 'bg-amber-50'}`}>{online ? <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" /> : <CloudOff className="mt-1 shrink-0 text-amber-600" />}<div><h2 className="text-lg font-bold text-pine-900">{online ? 'Con conexión' : 'Trabajando sin conexión'}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{online ? 'Puedes enviar los cambios guardados y recibir actualizaciones autorizadas.' : 'Puedes continuar trabajando. Intentaremos sincronizar automáticamente cuando vuelva internet.'}</p></div></div>
      <div className="grid gap-6 p-6 md:grid-cols-3 md:p-8"><div><p className="text-sm text-slate-500">Pendientes</p><p className="mt-1 text-4xl font-bold text-pine-900">{count}</p></div><div><p className="text-sm text-slate-500">Con errores</p><p className="mt-1 text-4xl font-bold text-pine-900">{summary?.errors ?? 0}</p></div><div><p className="text-sm text-slate-500">Conflictos</p><p className="mt-1 text-4xl font-bold text-pine-900">{summary?.conflicts ?? 0}</p></div></div>
      <div className="border-t border-slate-100 p-6 md:flex md:items-center md:justify-between md:p-8"><div className="mb-4 flex items-center gap-3 text-sm text-slate-500 md:mb-0"><ShieldCheck className="text-pine-600" /> Nada se elimina antes de ser confirmado.</div><button className="btn-primary" disabled={running || !online} onClick={() => void run()}><RefreshCw className={running ? 'animate-spin' : ''} size={18} />{running ? 'Sincronizando…' : 'Sincronizar ahora'}</button></div>
    </section>
    {message && <div className="mt-5 flex items-start gap-3 rounded-xl bg-white p-4 text-sm text-slate-700 shadow-sm"><AlertCircle className="shrink-0 text-coral-500" size={20} /><span>{message}</span></div>}
  </div>;
}

