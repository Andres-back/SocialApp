import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpenCheck,
  Boxes,
  Eye,
  EyeOff,
  FileClock,
  ListChecks,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UsersRound,
} from 'lucide-react';
import {
  APP_FEATURES,
  type AdminUserData,
  type AppFeatureKey,
  type AuditLogData,
  type ConfigurableRuleData,
  type FeatureVisibilityData,
} from '@socialapp/shared';
import { api } from '../lib/api';
import { createId } from '../lib/uuid';

type Overview = {
  users: AdminUserData[];
  rules: ConfigurableRuleData[];
  auditLogs: AuditLogData[];
  catalogs: Record<string, { id: string; name: string; active: boolean }[]>;
  instruments: { id: string; name: string; version: number; questions: unknown[] }[];
};

type AdminTab = 'users' | 'sections' | 'catalogs' | 'rules' | 'instruments' | 'audit';
type Notice = { tone: 'success' | 'error'; text: string };

const adminTabs = [
  { key: 'users', label: 'Usuarios', icon: UsersRound },
  { key: 'sections', label: 'Secciones', icon: SlidersHorizontal },
  { key: 'catalogs', label: 'Catálogos', icon: Boxes },
  { key: 'rules', label: 'Reglas', icon: ListChecks },
  { key: 'instruments', label: 'Instrumentos', icon: BookOpenCheck },
  { key: 'audit', label: 'Auditoría', icon: FileClock },
] as const;

export function AdminPage() {
  const [data, setData] = useState<Overview>();
  const [tab, setTab] = useState<AdminTab>('users');
  const [notice, setNotice] = useState<Notice>();
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await api.adminOverview() as unknown as Overview);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'No fue posible abrir administración.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (!data) {
    return (
      <div className="card grid min-h-72 place-items-center p-10 text-center">
        <div>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pine-50 text-pine-700">
            <Settings className={loading ? 'animate-spin' : ''} />
          </span>
          <p className="mt-4 font-semibold text-pine-900">{loading ? 'Preparando el centro de administración…' : 'Administración no disponible'}</p>
          <p className="mt-2 text-sm text-slate-500">{notice?.text}</p>
          {!loading && <button className="btn-primary mt-5" onClick={() => void load()}><RefreshCw size={17}/>Reintentar</button>}
        </div>
      </div>
    );
  }

  const activeUsers = data.users.filter((user) => user.status === 'ACTIVE').length;
  const catalogItems = Object.values(data.catalogs).reduce((total, items) => total + items.length, 0);
  const notify = (text: string) => setNotice({ tone: 'success', text });

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pine-900 via-pine-800 to-emerald-700 p-6 text-white shadow-xl shadow-pine-900/10 md:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
              <ShieldCheck size={15}/> Control institucional
            </span>
            <h1 className="mt-4 font-display text-4xl md:text-5xl">Centro de administración</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-pine-100">
              Gestiona accesos, experiencia del equipo, catálogos, instrumentos y trazabilidad desde un solo lugar.
            </p>
          </div>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''}/>{loading ? 'Actualizando…' : 'Actualizar datos'}
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen administrativo">
        <Metric icon={<UsersRound size={20}/>} value={activeUsers} label="Usuarios activos" detail={data.users.length + ' registrados'} />
        <Metric icon={<BookOpenCheck size={20}/>} value={data.instruments.length} label="Instrumentos" detail="Disponibles para gestión" />
        <Metric icon={<Boxes size={20}/>} value={catalogItems} label="Elementos de catálogo" detail="Programas y deportes" />
        <Metric icon={<Activity size={20}/>} value={data.auditLogs.length} label="Eventos recientes" detail="Trazabilidad visible" />
      </section>

      <nav className="card flex gap-2 overflow-x-auto p-2" aria-label="Módulos de administración">
        {adminTabs.map((item) => {
          const Icon = item.icon;
          const selected = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => { setTab(item.key); setNotice(undefined); }}
              className={'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ' + (selected ? 'bg-pine-800 text-white shadow-md shadow-pine-900/15' : 'text-slate-600 hover:bg-pine-50 hover:text-pine-800')}
              aria-current={selected ? 'page' : undefined}
            >
              <Icon size={18}/>{item.label}
            </button>
          );
        })}
      </nav>

      {notice && (
        <div role={notice.tone === 'error' ? 'alert' : 'status'} className={'rounded-2xl border px-4 py-3 text-sm font-medium ' + (notice.tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
          {notice.text}
        </div>
      )}

      <main>
        {tab === 'users' && <Users data={data.users} reload={load} notify={notify}/>}
        {tab === 'sections' && <FeatureSections notify={notify}/>}
        {tab === 'catalogs' && <Catalogs data={data.catalogs} reload={load} notify={notify}/>}
        {tab === 'rules' && <Rules data={data.rules} reload={load} notify={notify}/>}
        {tab === 'instruments' && <Instruments data={data.instruments} reload={load} notify={notify}/>}
        {tab === 'audit' && <Audit data={data.auditLogs}/>}
      </main>
    </div>
  );
}

function Metric({ icon, value, label, detail }: { icon: React.ReactNode; value: number; label: string; detail: string }) {
  return (
    <article className="card flex items-center gap-4 p-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pine-50 text-pine-700">{icon}</span>
      <div>
        <p className="text-2xl font-black text-pine-900">{value}</p>
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
      </div>
    </article>
  );
}

const featureLabels: Record<AppFeatureKey, { name: string; description: string }> = {
  [APP_FEATURES.ATHLETES]: { name: 'Deportistas', description: 'Registro, consulta, edición e impresión de deportistas.' },
  [APP_FEATURES.SOCIAL_WORK]: { name: 'Trabajo Social', description: 'Fichas sociales, caracterización, alertas, seguimientos y diagramas.' },
  [APP_FEATURES.CAMPAIGNS]: { name: 'Brigadas', description: 'Creación de brigadas, aplicación de tamizajes y resultados.' },
  [APP_FEATURES.INSTRUMENTS]: { name: 'Instrumentos', description: 'Edición, vista previa, aplicación e impresión de cuestionarios.' },
  [APP_FEATURES.REPORTS]: { name: 'Reportes', description: 'Indicadores, reportes poblacionales e individuales.' },
  [APP_FEATURES.CATALOGS]: { name: 'Catálogos', description: 'Programas, deportes, categorías y entrenadores.' },
  [APP_FEATURES.SYNC]: { name: 'Sincronización', description: 'Estado y resolución de cambios pendientes del dispositivo.' },
};

function FeatureSections({ notify }: { notify: (message: string) => void }) {
  const [items, setItems] = useState<FeatureVisibilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function loadSections() {
    setLoading(true);
    setError('');
    try {
      setItems(await api.featureVisibility());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cargar las secciones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadSections(); }, []);
  const visibleCount = useMemo(() => items.filter((item) => item.enabledForSocialWorker).length, [items]);

  async function toggle(item: FeatureVisibilityData) {
    setBusy(item.key);
    setError('');
    try {
      const saved = await api.updateFeatureVisibility(item.key, !item.enabledForSocialWorker);
      setItems((current) => current.map((value) => value.key === saved.key ? saved : value));
      notify(saved.enabledForSocialWorker ? featureLabels[saved.key].name + ' ahora es visible para Trabajo Social.' : featureLabels[saved.key].name + ' quedó oculta para Trabajo Social.');
      window.dispatchEvent(new Event('socialapp:features-updated'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible actualizar la sección.');
      await loadSections();
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-pine-100 bg-gradient-to-r from-pine-50 to-white p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-coral-600">Experiencia por perfil</p>
          <h2 className="mt-2 font-display text-3xl text-pine-900">Secciones para Trabajo Social</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Define qué aparece en el menú, el inicio y las rutas directas. El perfil administrador siempre conserva acceso completo.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-2xl font-black text-pine-800">{visibleCount}<span className="text-sm text-slate-400">/{items.length || 7}</span></p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Visibles</p>
          </div>
          <button type="button" className="btn-secondary min-h-12 px-4" onClick={() => void loadSections()} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''}/>Actualizar
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}

      {loading ? (
        <div className="card p-12 text-center text-sm text-slate-500">Consultando configuración institucional…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const label = featureLabels[item.key];
            const enabled = item.enabledForSocialWorker;
            const saving = busy === item.key;
            return (
              <article key={item.key} className={'rounded-2xl border p-5 transition ' + (enabled ? 'border-emerald-100 bg-white shadow-sm' : 'border-slate-200 bg-slate-50')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className={'grid h-12 w-12 shrink-0 place-items-center rounded-2xl ' + (enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500')}>
                      {enabled ? <Eye size={21}/> : <EyeOff size={21}/>}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-pine-900">{label.name}</h3>
                        <span className={'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ' + (enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600')}>
                          {enabled ? 'Visible' : 'Oculta'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{label.description}</p>
                      {item.updatedAt && <p className="mt-3 text-[11px] text-slate-400">Actualizada {new Date(item.updatedAt).toLocaleString('es-CO')}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={(enabled ? 'Ocultar ' : 'Mostrar ') + label.name + ' para Trabajo Social'}
                    disabled={saving}
                    onClick={() => void toggle(item)}
                    className={'relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus:ring-4 focus:ring-pine-100 disabled:opacity-50 ' + (enabled ? 'bg-emerald-600' : 'bg-slate-300')}
                  >
                    <span className={'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ' + (enabled ? 'left-6' : 'left-1')} />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs font-medium text-slate-400">{saving ? 'Guardando configuración…' : 'Aplicado al perfil Trabajo Social'}</span>
                  <button type="button" className="text-xs font-black text-pine-700 hover:text-pine-900 disabled:opacity-50" disabled={saving} onClick={() => void toggle(item)}>
                    {enabled ? 'Ocultar sección' : 'Hacer visible'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Users({ data, reload, notify }: { data: AdminUserData[]; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('SOCIAL_WORKER');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const roleNames: Record<string, string> = { SOCIAL_WORKER: 'Trabajo Social', COACH: 'Entrenador', COORDINATOR: 'Coordinación', ADMIN: 'Administrador' };
  const statusNames: Record<string, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo', LOCKED: 'Bloqueado' };

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.createUser({ email, displayName: name, password, roles: [role] });
      notify('Usuario creado correctamente.');
      setOpen(false);
      setEmail('');
      setName('');
      setPassword('');
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible crear el usuario.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(user: AdminUserData, status: string) {
    setUpdatingId(user.id);
    setError('');
    try {
      await api.updateUserStatus(user.id, status);
      notify('Estado de ' + user.displayName + ' actualizado.');
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible actualizar el usuario.');
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-coral-600">Acceso y permisos</p>
          <h2 className="mt-2 font-display text-3xl text-pine-900">Equipo de trabajo</h2>
          <p className="mt-2 text-sm text-slate-500">Administra perfiles, roles institucionales y estado de acceso.</p>
        </div>
        <button className="btn-primary px-5" onClick={() => setOpen(!open)}><Plus size={17}/>{open ? 'Cerrar formulario' : 'Nuevo usuario'}</button>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {open && (
        <div className="rounded-3xl border border-pine-100 bg-gradient-to-br from-white to-pine-50 p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-pine-800 text-white"><UserCog size={20}/></span>
            <div><h3 className="font-bold text-pine-900">Crear acceso institucional</h3><p className="text-xs text-slate-500">La contraseña temporal debe tener al menos 10 caracteres.</p></div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">Nombre completo<input className="field mt-2 font-normal" placeholder="Ej. Laura Martínez" value={name} onChange={(event) => setName(event.target.value)}/></label>
            <label className="text-sm font-bold text-slate-700">Correo institucional<input type="email" className="field mt-2 font-normal" placeholder="nombre@institucion.org" value={email} onChange={(event) => setEmail(event.target.value)}/></label>
            <label className="text-sm font-bold text-slate-700">Contraseña temporal<input type="password" className="field mt-2 font-normal" placeholder="Mínimo 10 caracteres" value={password} onChange={(event) => setPassword(event.target.value)}/></label>
            <label className="text-sm font-bold text-slate-700">Rol inicial<select className="field mt-2 font-normal" value={role} onChange={(event) => setRole(event.target.value)}><option value="SOCIAL_WORKER">Trabajo Social</option><option value="COACH">Entrenador</option><option value="COORDINATOR">Coordinación</option><option value="ADMIN">Administrador</option></select></label>
          </div>
          <button className="btn-primary mt-5 w-full md:w-auto" disabled={saving || !name.trim() || !email.trim() || password.length < 10} onClick={() => void save()}><Save size={17}/>{saving ? 'Creando acceso…' : 'Crear usuario'}</button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.map((user) => (
          <article key={user.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pine-50 font-black text-pine-700">{user.displayName.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-pine-900">{user.displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <span className={'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ' + (user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : user.status === 'LOCKED' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600')}>{statusNames[user.status] ?? user.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{user.roles.map((item) => <span key={item} className="rounded-full bg-pine-50 px-3 py-1 text-xs font-bold text-pine-700">{roleNames[item] ?? item}</span>)}</div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Estado de acceso<select aria-label={'Estado de ' + user.displayName} className="field mt-2" value={user.status} disabled={updatingId === user.id} onChange={(event) => void updateStatus(user, event.target.value)}><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="LOCKED">Bloqueado</option></select></label>
              <p className="mt-3 text-[11px] text-slate-400">{user.lastLoginAt ? 'Último acceso: ' + new Date(user.lastLoginAt).toLocaleString('es-CO') : 'Sin accesos registrados'}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Catalogs({ data, reload, notify }: { data: Overview['catalogs']; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [kind, setKind] = useState('programs');
  const [name, setName] = useState('');
  async function save() { await api.createCatalog(kind, name); setName(''); notify('Catálogo actualizado.'); await reload(); }
  return <section className="mt-5"><h2 className="font-display text-3xl text-pine-900">Catálogos deportivos</h2><p className="mt-2 text-sm text-slate-500">Mantén actualizadas las opciones utilizadas en los formularios operativos.</p><div className="card mt-5 flex flex-col gap-3 p-5 sm:flex-row"><select className="field" value={kind} onChange={(event) => setKind(event.target.value)}><option value="programs">Programas</option><option value="sports">Deportes</option><option value="categories">Categorías</option><option value="coaches">Entrenadores</option></select><input className="field" placeholder="Nuevo nombre" value={name} onChange={(event) => setName(event.target.value)}/><button className="btn-primary shrink-0" onClick={() => void save()}><Plus size={17}/>Agregar</button></div><div className="mt-5 grid gap-4 md:grid-cols-2">{Object.entries(data).map(([key, items]) => <article key={key} className="card p-5"><h3 className="font-semibold capitalize text-pine-900">{key}</h3><div className="mt-3 flex flex-wrap gap-2">{items.map((item) => <span key={item.id} className="rounded-full bg-pine-50 px-3 py-2 text-xs font-semibold text-pine-700">{item.name}</span>)}</div></article>)}</div></section>;
}

function Rules({ data, reload, notify }: { data: ConfigurableRuleData[]; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [indicator, setIndicator] = useState('');
  const [field, setField] = useState('transportDifficulty');
  const [value, setValue] = useState('FREQUENTLY');
  async function save() { await api.saveRule({ id: createId(), name: indicator, source: 'SOCIOECONOMIC', field, operator: 'EQUALS', expectedValue: value, indicator, level: 'YELLOW', active: true }); notify('Regla guardada sin cambiar el código fuente.'); setIndicator(''); await reload(); }
  return <section className="mt-5"><h2 className="font-display text-3xl text-pine-900">Motor de reglas</h2><p className="mt-2 text-sm text-slate-500">Configura indicadores institucionales sin modificar el código.</p><div className="card mt-5 grid gap-4 p-5 md:grid-cols-2"><input className="field" placeholder="Nombre e indicador" value={indicator} onChange={(event) => setIndicator(event.target.value)}/><input className="field" placeholder="Campo" value={field} onChange={(event) => setField(event.target.value)}/><input className="field" placeholder="Valor esperado" value={value} onChange={(event) => setValue(event.target.value)}/><button className="btn-primary" onClick={() => void save()}><ShieldCheck size={17}/>Crear regla</button></div><div className="mt-5 space-y-3">{data.map((rule) => <article key={rule.id} className="card p-4"><p className="font-semibold text-pine-900">{rule.name}</p><p className="mt-1 text-xs text-slate-500">{rule.source}.{rule.field} {rule.operator} {rule.expectedValue} → {rule.level}</p><p className="mt-2 text-sm">{rule.indicator}</p></article>)}</div></section>;
}

function Instruments({ data, reload, notify }: { data: Overview['instruments']; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  async function save() { await api.saveInstrument({ id: createId(), name, version: 1, active: true, questions: [{ id: createId(), dimension: 'General', prompt, type: 'YES_NO', options: ['Sí', 'No'], required: true }] }); notify('Instrumento versionado creado.'); setName(''); setPrompt(''); await reload(); }
  return <section className="mt-5"><h2 className="font-display text-3xl text-pine-900">Instrumentos configurables</h2><p className="mt-2 text-sm text-slate-500">Crea nuevas versiones sin alterar las respuestas históricas.</p><div className="card mt-5 grid gap-4 p-5 md:grid-cols-2"><input className="field" placeholder="Nombre del instrumento" value={name} onChange={(event) => setName(event.target.value)}/><input className="field" placeholder="Primera pregunta" value={prompt} onChange={(event) => setPrompt(event.target.value)}/><button className="btn-primary md:col-span-2" onClick={() => void save()}><BookOpenCheck size={17}/>Crear instrumento v1</button></div><div className="mt-5 grid gap-4 md:grid-cols-2">{data.map((instrument) => <article key={instrument.id} className="card p-5"><p className="font-semibold text-pine-900">{instrument.name} v{instrument.version}</p><p className="mt-2 text-sm text-slate-500">{instrument.questions.length} preguntas</p></article>)}</div></section>;
}

function Audit({ data }: { data: AuditLogData[] }) {
  return <section className="mt-5"><div className="flex items-center gap-3"><RefreshCw className="text-pine-600"/><div><h2 className="font-display text-3xl text-pine-900">Auditoría</h2><p className="mt-1 text-sm text-slate-500">Registro cronológico de acciones administrativas y operativas.</p></div></div><div className="card mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-pine-50 text-xs uppercase text-pine-700"><tr><th className="p-4">Fecha</th><th className="p-4">Usuario</th><th className="p-4">Acción</th><th className="p-4">Recurso</th><th className="p-4">Resultado</th></tr></thead><tbody>{data.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="p-4">{new Date(item.createdAt).toLocaleString('es-CO')}</td><td className="p-4">{item.actorName || 'Sistema'}</td><td className="p-4">{item.action}</td><td className="p-4">{item.resourceType || '—'}</td><td className="p-4">{item.outcome}</td></tr>)}</tbody></table></div></section>;
}
