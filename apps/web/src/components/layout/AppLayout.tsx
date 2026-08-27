import { useEffect, useState, type ReactNode } from 'react';
import { Bell, CloudOff, Menu, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConnection } from '../../hooks/useConnection';
import { usePendingCount } from '../../hooks/usePendingCount';
import { setupAutomaticSync } from '../../lib/sync-engine';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const online = useConnection();
  const { count, refresh } = usePendingCount();

  useEffect(() => setupAutomaticSync(refresh), [refresh]);

  return (
    <div className="min-h-screen bg-[#f5f7f3] lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="hidden border-r border-pine-900/10 bg-pine-800 lg:block">
        <div className="sticky top-0 h-screen"><Sidebar onNavigate={() => undefined} /></div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Cerrar menú" className="absolute inset-0 bg-pine-950/45" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-[min(85vw,300px)] bg-pine-800 shadow-2xl">
            <button aria-label="Cerrar menú" className="absolute right-3 top-3 z-10 rounded-lg p-2 text-white" onClick={() => setMenuOpen(false)}><X /></button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-[#f5f7f3]/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button aria-label="Abrir menú" className="rounded-xl p-2 text-pine-800 hover:bg-white lg:hidden" onClick={() => setMenuOpen(true)}><Menu /></button>
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {online ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : <CloudOff size={14} />}
              {online ? 'En línea' : 'Sin conexión'}
            </div>
            <Link to="/sincronizacion" className="hidden items-center gap-2 text-sm font-medium text-slate-600 sm:flex">
              <RefreshCw size={15} /> {count} pendiente{count === 1 ? '' : 's'}
            </Link>
          </div>
          <button aria-label="Notificaciones" className="relative rounded-xl bg-white p-2.5 text-slate-600 shadow-sm">
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral-500" />
          </button>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 pb-24 md:p-8">{children}</main>
      </div>
    </div>
  );
}
