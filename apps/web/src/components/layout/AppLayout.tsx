import { useEffect, useState, type ReactNode } from 'react';
import { Bell, CloudOff, Menu, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useConnection } from '../../hooks/useConnection';
import { usePendingCount } from '../../hooks/usePendingCount';
import { setupAutomaticSync } from '../../lib/sync-engine';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const online = useConnection();
  const { count, refresh } = usePendingCount();

  useEffect(() => setupAutomaticSync(refresh), [refresh]);

  return (
    <div className="app-canvas min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-pine-900/10 bg-pine-800 lg:block">
        <div className="sticky top-0 h-screen"><Sidebar onNavigate={() => undefined} /></div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Cerrar menú" className="absolute inset-0 bg-pine-950/55 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-[min(88vw,310px)] bg-pine-800 shadow-2xl">
            <button aria-label="Cerrar menú" className="absolute right-3 top-3 z-10 rounded-xl bg-white/10 p-2 text-white" onClick={() => setMenuOpen(false)}><X /></button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="relative min-w-0">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-[#f7f8f5]/85 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button aria-label="Abrir menú" className="rounded-xl border border-slate-200 bg-white p-2.5 text-pine-800 shadow-sm transition hover:border-pine-100 hover:bg-pine-50 lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
              <div className="hidden sm:block lg:hidden">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-coral-600">SocialApp</p>
                <p className="text-sm font-semibold text-pine-900">{user?.displayName}</p>
              </div>
              <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${online ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                {online ? <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" /><span className="relative h-2 w-2 rounded-full bg-emerald-500" /></span> : <CloudOff size={14} />}
                {online ? 'En línea' : 'Sin conexión'}
              </div>
              <Link to="/sincronizacion" className="hidden items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-pine-700 sm:flex">
                <RefreshCw size={14} /> {count} pendiente{count === 1 ? '' : 's'}
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right xl:block">
                <p className="text-xs font-semibold text-pine-900">{user?.displayName}</p>
                <p className="text-[11px] text-slate-400">Espacio de trabajo</p>
              </div>
              <button aria-label="Notificaciones" className="relative rounded-xl border border-slate-200/80 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-pine-100 hover:text-pine-700">
                <Bell size={19} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-coral-500" />
              </button>
            </div>
          </div>
        </header>
        <main className="relative mx-auto max-w-[1480px] p-4 pb-24 md:p-8 lg:p-9">{children}</main>
      </div>
    </div>
  );
}
