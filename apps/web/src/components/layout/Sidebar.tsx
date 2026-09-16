import { BookOpenCheck, ClipboardEdit, FileText, HeartHandshake, Home, ListPlus, LogOut, Settings, ShieldCheck, UsersRound, Wifi } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { APP_FEATURES, PERMISSIONS } from '@socialapp/shared';
import { useAuth } from '../../features/auth/useAuth';
import { useFeatureVisibility } from '../../features/visibility/useFeatureVisibility';

const items = [
  { to: '/', label: 'Inicio', icon: Home, permission: null, feature: null },
  { to: '/deportistas', label: 'Deportistas', icon: UsersRound, permission: PERMISSIONS.ATHLETE_READ, feature: APP_FEATURES.ATHLETES },
  { to: '/trabajo-social', label: 'Trabajo Social', icon: ClipboardEdit, permission: PERMISSIONS.SOCIAL_RECORD_READ, feature: APP_FEATURES.SOCIAL_WORK },
  { to: '/brigadas', label: 'Brigadas', icon: ShieldCheck, permission: PERMISSIONS.SCREENING_READ, feature: APP_FEATURES.CAMPAIGNS },
  { to: '/instrumentos', label: 'Instrumentos', icon: BookOpenCheck, permission: PERMISSIONS.SCREENING_WRITE, feature: APP_FEATURES.INSTRUMENTS },
  { to: '/reportes', label: 'Reportes', icon: FileText, permission: PERMISSIONS.DASHBOARD_AGGREGATE_READ, feature: APP_FEATURES.REPORTS },
  { to: '/catalogos', label: 'Catálogos', icon: ListPlus, permission: PERMISSIONS.CATALOG_MANAGE, feature: APP_FEATURES.CATALOGS },
  { to: '/sincronizacion', label: 'Sincronización', icon: Wifi, permission: PERMISSIONS.SYNC_EXECUTE, feature: APP_FEATURES.SYNC },
];

function getInitials(displayName = '') {
  return displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout, can } = useAuth();
  const { isVisible } = useFeatureVisibility();
  const visibleItems = [
    ...items.filter((item) => (!item.permission || can(item.permission)) && (!item.feature || isVisible(item.feature))),
    ...(can(PERMISSIONS.ADMIN_USERS) ? [{ to: '/administracion', label: 'Administración', icon: Settings, permission: PERMISSIONS.ADMIN_USERS, feature: null }] : []),
  ];
  const roleLabel = user?.roles.includes('ADMIN')
    ? 'Administración'
    : user?.roles.includes('COORDINATOR')
      ? 'Coordinación'
      : user?.roles.includes('COACH')
        ? 'Entrenador'
        : 'Trabajo Social';

  return (
    <div className="flex h-full flex-col px-4 py-5 text-white">
      <div className="flex items-center gap-3 px-2 pb-7">
        <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-coral-500 to-orange-400 text-xl font-bold shadow-lg shadow-pine-950/20">
          S
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[3px] border-pine-800 bg-emerald-400" />
        </div>
        <div>
          <p className="font-display text-[1.35rem] leading-none">SocialApp</p>
          <p className="mt-1.5 text-[11px] font-medium tracking-wide text-pine-100">Gestión social deportiva</p>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-pine-100/70">
        <HeartHandshake size={13} /> Herramientas
      </div>
      <nav className="space-y-1.5" aria-label="Navegación principal">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) => `group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white text-pine-900 shadow-lg shadow-pine-950/15' : 'text-pine-50/90 hover:bg-white/10 hover:text-white'}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-coral-500" />}
                <span className={`grid h-8 w-8 place-items-center rounded-lg transition ${isActive ? 'bg-pine-50 text-pine-700' : 'bg-white/5 group-hover:bg-white/10'}`}><Icon size={18} /></span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-pine-100/70">Sesión institucional</p>
          <p className="mt-1 text-xs leading-5 text-pine-50/80">Tus datos se guardan de forma segura y pueden sincronizarse al volver la conexión.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-pine-900/50 p-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sand-100 to-white text-sm font-extrabold text-pine-800 shadow-sm">{getInitials(user?.displayName)}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.displayName}</p>
              <p className="mt-0.5 truncate text-[11px] text-pine-100">{roleLabel}</p>
            </div>
          </div>
          <button onClick={() => void logout()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-pine-100 transition hover:bg-white/10 hover:text-white"><LogOut size={15} /> Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}
