import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, MapPin, Play } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { ScreeningCampaignData } from '@socialapp/shared';
import { loadCampaigns } from '../features/work/work-repository';

export function CampaignModePage() {
  const { id = '' } = useParams(); const [item, setItem] = useState<ScreeningCampaignData>();
  useEffect(() => { loadCampaigns().then((items) => setItem(items.find((campaign) => campaign.id === id))); }, [id]);
  if (!item) return <div className="p-12 text-center text-sm text-slate-500">Preparando modo brigada…</div>;
  const completed = item.participants.filter((p) => p.status === 'COMPLETED').length;
  return <div><Link to="/brigadas" className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Todas las brigadas</Link><header className="mt-5 rounded-3xl bg-pine-800 p-6 text-white md:p-8"><p className="text-sm text-pine-100">Modo Brigada</p><h1 className="mt-1 font-display text-4xl">{item.name}</h1><p className="mt-3 flex items-center gap-2 text-sm text-pine-100"><MapPin size={17}/>{item.place} · {item.date}</p><div className="mt-6 grid grid-cols-3 gap-3"><Mini value={item.participants.length} label="Total"/><Mini value={item.participants.length-completed} label="Pendientes"/><Mini value={completed} label="Completados"/></div></header>
    <div className="mt-6 space-y-3">{item.participants.map((person) => <article key={person.id} className="card flex items-center justify-between gap-4 p-4"><div className="flex items-center gap-3">{person.status === 'COMPLETED' ? <CheckCircle2 className="text-emerald-600"/> : <Circle className="text-slate-300"/>}<div><p className="font-semibold text-pine-900">{person.athleteName}</p><p className="text-xs text-slate-500">{person.status === 'COMPLETED' ? 'Completado' : person.status === 'IN_PROGRESS' ? 'En proceso' : 'Pendiente'}</p></div></div><Link to={`/brigadas/${item.id}/deportistas/${person.athleteId}`} className={person.status === 'COMPLETED' ? 'btn-secondary min-h-10 px-3 py-2' : 'btn-primary min-h-10 px-3 py-2'}><Play size={16}/>{person.status === 'COMPLETED' ? 'Revisar' : 'Aplicar'}</Link></article>)}</div>
  </div>;
}
function Mini({ value, label }: { value:number; label:string }) { return <div className="rounded-2xl bg-white/10 p-4 text-center"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-pine-100">{label}</p></div>; }
