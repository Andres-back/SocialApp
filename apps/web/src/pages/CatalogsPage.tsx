import { useCallback, useEffect, useState } from 'react';
import { Check, CircleOff, ListPlus, Pencil, Plus, RotateCcw, Save, WifiOff, X } from 'lucide-react';
import type { ManageableCatalogItem, ManageableSportsCatalogs } from '@socialapp/shared';
import { loadCatalogs } from '../features/athletes/athlete-repository';
import { useConnection } from '../hooks/useConnection';
import { api } from '../lib/api';

type CatalogKind = keyof ManageableSportsCatalogs;

const sections: { kind: CatalogKind; title: string; singular: string; description: string }[] = [
  { kind: 'sports', title: 'Deportes', singular: 'deporte', description: 'Disciplinas disponibles al registrar deportistas y brigadas.' },
  { kind: 'programs', title: 'Programas', singular: 'programa', description: 'Líneas o modalidades institucionales de vinculación.' },
  { kind: 'categories', title: 'Categorías', singular: 'categoría', description: 'Grupos de edad o niveles usados en el expediente.' },
  { kind: 'coaches', title: 'Entrenadores', singular: 'entrenador', description: 'Profesionales responsables de los procesos deportivos.' },
];

export function CatalogsPage() {
  const online = useConnection();
  const [catalogs, setCatalogs] = useState<ManageableSportsCatalogs>();
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCatalogs(await api.manageableCatalogs());
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No fue posible cargar los catálogos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function mutate(key: string, action: () => Promise<unknown>, successMessage: string) {
    if (!online) return setMessage({ tone: 'error', text: 'Conéctate a internet para modificar los catálogos institucionales.' });
    setBusyKey(key);
    setMessage(undefined);
    try {
      await action();
      await refresh();
      await loadCatalogs();
      setMessage({ tone: 'success', text: successMessage });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No fue posible guardar el cambio.' });
    } finally {
      setBusyKey('');
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Configuración operativa</p>
          <h1 className="mt-1 font-display text-4xl text-pine-900">Catálogos editables</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Añade, corrige o retira opciones utilizadas en los formularios. Los valores retirados dejan de aparecer en nuevos registros, pero permanecen en los expedientes existentes.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-pine-50 px-4 py-2 text-xs font-bold text-pine-700"><ListPlus size={16} /> Cambios institucionales</div>
      </div>

      {!online && <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><WifiOff className="shrink-0" size={20} /><span>Puedes consultar esta pantalla, pero necesitas conexión para editar los catálogos.</span></div>}
      {message && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${message.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</p>}

      {loading && !catalogs ? (
        <div className="card mt-7 p-10 text-center text-sm text-slate-500">Cargando catálogos…</div>
      ) : (
        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          {sections.map((section) => (
            <CatalogSection
              key={section.kind}
              {...section}
              items={catalogs?.[section.kind] ?? []}
              online={online}
              busyKey={busyKey}
              onCreate={(name) => mutate(`create:${section.kind}`, () => api.createOperationalCatalog(section.kind, name), `${section.title}: “${name.trim()}” quedó disponible.`)}
              onUpdate={(id, body, successMessage) => mutate(`${section.kind}:${id}`, () => api.updateOperationalCatalog(section.kind, id, body), successMessage)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogSection({ kind, title, singular, description, items, online, busyKey, onCreate, onUpdate }: {
  kind: CatalogKind;
  title: string;
  singular: string;
  description: string;
  items: ManageableCatalogItem[];
  online: boolean;
  busyKey: string;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: string, body: { name?: string; active?: boolean }, successMessage: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState('');
  const activeCount = items.filter((item) => item.active).length;
  const newLabel = singular === 'categoría' ? `Nueva ${singular}` : `Nuevo ${singular}`;

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    await onCreate(newName);
    setNewName('');
  }

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 bg-sand-50/70 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-display text-2xl text-pine-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-pine-700 shadow-sm">{activeCount} activo{activeCount === 1 ? '' : 's'}</span>
        </div>
        <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={create}>
          <label className="sr-only" htmlFor={`new-${kind}`}>{newLabel}</label>
          <input id={`new-${kind}`} className="field flex-1" placeholder={newLabel} value={newName} maxLength={160} onChange={(event) => setNewName(event.target.value)} />
          <button className="btn-primary shrink-0 px-4" disabled={!online || !newName.trim() || busyKey === `create:${kind}`}><Plus size={17} /> {busyKey === `create:${kind}` ? 'Agregando…' : 'Agregar'}</button>
        </form>
      </div>
      <div className="divide-y divide-slate-100 px-5 md:px-6">
        {items.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Todavía no hay valores registrados.</p>}
        {items.map((item) => <CatalogRow key={item.id} item={item} singular={singular} disabled={!online || busyKey === `${kind}:${item.id}`} onUpdate={onUpdate} />)}
      </div>
    </section>
  );
}

function CatalogRow({ item, singular, disabled, onUpdate }: {
  item: ManageableCatalogItem;
  singular: string;
  disabled: boolean;
  onUpdate: (id: string, body: { name?: string; active?: boolean }, successMessage: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);

  async function rename() {
    if (!name.trim() || name.trim() === item.name) return setEditing(false);
    await onUpdate(item.id, { name }, `El ${singular} ahora se llama “${name.trim()}”.`);
    setEditing(false);
  }

  return (
    <div className={`py-4 ${item.active ? '' : 'opacity-65'}`}>
      {editing ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input aria-label={`Editar ${item.name}`} className="field flex-1" value={name} maxLength={160} autoFocus onChange={(event) => setName(event.target.value)} />
          <div className="flex gap-2"><button className="btn-primary min-h-11 flex-1 px-3" disabled={disabled || !name.trim()} onClick={() => void rename()}><Save size={16} /> Guardar</button><button aria-label="Cancelar edición" className="btn-secondary min-h-11 px-3" onClick={() => { setName(item.name); setEditing(false); }}><X size={16} /></button></div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{item.active ? <Check size={17} /> : <CircleOff size={17} />}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-pine-900">{item.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{item.usageCount} uso{item.usageCount === 1 ? '' : 's'} · {item.active ? 'Disponible' : 'Retirado'}</p></div>
          <button aria-label={`Editar ${item.name}`} title="Editar nombre" className="rounded-lg p-2 text-slate-400 transition hover:bg-pine-50 hover:text-pine-700" disabled={disabled} onClick={() => setEditing(true)}><Pencil size={17} /></button>
          <button aria-label={`${item.active ? 'Retirar' : 'Activar'} ${item.name}`} title={item.active ? 'Retirar de nuevos registros' : 'Volver a activar'} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${item.active ? 'text-slate-500 hover:bg-red-50 hover:text-red-700' : 'bg-pine-50 text-pine-700 hover:bg-pine-100'}`} disabled={disabled} onClick={() => void onUpdate(item.id, { active: !item.active }, item.active ? `“${item.name}” se retiró de nuevos registros.` : `“${item.name}” volvió a estar disponible.`)}>{item.active ? <CircleOff size={15} /> : <RotateCcw size={15} />}<span className="hidden sm:inline">{item.active ? 'Retirar' : 'Activar'}</span></button>
        </div>
      )}
    </div>
  );
}
