import { ClipboardEdit, FileText, Home, LogOut, Settings, ShieldCheck, UsersRound, Wifi } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { PERMISSIONS } from '@socialapp/shared';
import { useAuth } from '../../features/auth/useAuth';

const items = [
  { to: '/', label: 'Inicio', icon: Home, permission: null },
  { to: '/deportistas', label: 'Deportistas', icon: UsersRound, permission: PERMISSIONS.ATHLETE_READ },
  { to: '/trabajo-social', label: 'Trabajo Social', icon: ClipboardEdit, permission: PERMISSIONS.SOCIAL_RECORD_READ },
  { to: '/brigadas', label: 'Brigadas', icon: ShieldCheck, permission: PERMISSIONS.SCREENING_READ },
  { to: '/reportes', label: 'Reportes', icon: FileText, permission: PERMISSIONS.DASHBOARD_AGGREGATE_READ },
  { to: '/sincronizacion', label: 'Sincronización', icon: Wifi, permission: PERMISSIONS.SYNC_EXECUTE },
];

export function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout, can } = useAuth();
  const visibleItems = [
    ...items.filter((item) => !item.permission || can(item.permission)),
    ...(can(PERMISSIONS.ADMIN_USERS) ? [{ to: '/administracion', label: 'Administración', icon: Settings, permission: PERMISSIONS.ADMIN_USERS }] : []),
  ];

  return (
    <div className="flex h-full flex-col px-4 py-5 text-white">
      <div className="flex items-center gap-3 px-2 pb-8">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-coral-500 text-lg font-bold">S</div>
        <div><p className="font-display text-xl leading-none">SocialApp</p><p className="mt-1 text-xs text-pine-100">Trabajo social deportivo</p></div>
      </div>
      <nav className="space-y-1" aria-label="Navegación principal">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive ? 'bg-white text-pine-900 shadow-lg' : 'text-pine-50 hover:bg-white/10'}`}>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl bg-pine-900/45 p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand-100 font-bold text-pine-800">{user?.displayName.slice(0, 1)}</div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.displayName}</p><p className="truncate text-xs text-pine-100">{user?.roles.includes('ADMIN') ? 'Administración' : user?.roles.includes('COORDINATOR') ? 'Coordinación' : user?.roles.includes('COACH') ? 'Entrenador' : 'Trabajo Social'}</p></div>
        </div>
        <button onClick={() => void logout()} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-pine-100 hover:bg-white/10"><LogOut size={16} /> Cerrar sesión</button>
      </div>
    </div>
  );
}
