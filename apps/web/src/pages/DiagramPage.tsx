import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { AthleteRecord, DiagramEdge, DiagramNode, NetworkDiagramData } from '@socialapp/shared';
import { loadAthlete, loadSocialRecord } from '../features/athletes/athlete-repository';
import { loadWorkspace, saveDiagramOffline } from '../features/work/work-repository';
import { createId } from '../lib/uuid';

export function DiagramPage() {
  const { id = '' } = useParams(); const location = useLocation(); const type = location.pathname.endsWith('/ecomapa') ? 'ecomap' : 'genogram';
  const [athlete, setAthlete] = useState<AthleteRecord>(); const [recordId, setRecordId] = useState<string>(() => createId()); const [version, setVersion] = useState(0); const [nodes, setNodes] = useState<DiagramNode[]>([]); const [edges, setEdges] = useState<DiagramEdge[]>([]); const [message, setMessage] = useState('');
  useEffect(() => { Promise.all([loadAthlete(id), loadSocialRecord(id), loadWorkspace(id)]).then(([person, social, workspace]) => {
    setAthlete(person); const existing = type === 'genogram' ? workspace.genogram : workspace.ecomap;
    if (existing) { setRecordId(existing.id); setVersion(existing.version); setNodes(existing.nodes); setEdges(existing.edges); return; }
    if (!person) return;
    if (type === 'genogram') {
      const center: DiagramNode = { id: 'athlete', label: `${person.firstNames} ${person.lastNames}`, kind: 'ATHLETE', x: 50, y: 65, metadata: { livesTogether: true } };
      const members = social?.householdMembers ?? [];
      const generated = members.map((member, index): DiagramNode => ({ id: member.id, label: member.name, kind: member.relationship, x: 15 + (index % 4) * 23, y: 20 + Math.floor(index / 4) * 25, metadata: { livesTogether: member.livesWithAthlete, quality: member.relationshipQuality } }));
      setNodes([center, ...generated]); setEdges(generated.map((node, index) => ({ id: `edge-${index}`, source: node.id, target: center.id, relation: String(node.metadata?.quality ?? 'ADEQUATE') })));
    } else {
      const center: DiagramNode = { id: 'athlete', label: `${person.firstNames} ${person.lastNames}`, kind: 'ATHLETE', x: 50, y: 50 };
      const networks = social?.supportNetworks ?? ['FAMILY', 'COACH', 'SCHOOL'];
      const labels: Record<string,string> = { FAMILY:'Familia extensa', FRIENDS:'Amigos', COACH:'Entrenador', SCHOOL:'Colegio', PUBLIC_INSTITUTIONS:'Instituciones públicas', COMMUNITY:'Comunidad', HEALTH_SERVICES:'Salud', SPORTS_ORGANIZATION:'Organización deportiva' };
      const generated = networks.map((network, index): DiagramNode => ({ id: `network-${index}`, label: labels[network] ?? network, kind: 'NETWORK', x: 50 + 38 * Math.cos((index / networks.length) * Math.PI * 2), y: 50 + 38 * Math.sin((index / networks.length) * Math.PI * 2), metadata: { intensity: 'MODERATE' } }));
      setNodes([center, ...generated]); setEdges(generated.map((node, index) => ({ id: `edge-${index}`, source: 'athlete', target: node.id, relation: 'MODERATE' })));
    }
  }); }, [id, type]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  function addNode() { const id = createId(); setNodes((current) => [...current, { id, label: type === 'genogram' ? 'Nuevo integrante' : 'Nueva red', kind: type === 'genogram' ? 'FAMILIAR' : 'NETWORK', x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 }]); setEdges((current) => [...current, { id: createId(), source: id, target: 'athlete', relation: type === 'genogram' ? 'ADEQUATE' : 'MODERATE' }]); }
  async function save() { const now = new Date().toISOString(); const input: NetworkDiagramData = { id: recordId, athleteId: id, nodes, edges, version, createdAt: now, updatedAt: now }; const result = await saveDiagramOffline(type, input); setVersion(result.version); setMessage('Diagrama guardado en este dispositivo y listo para sincronizar.'); }
  return <div>
    <Link to={`/deportistas/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Volver al expediente</Link>
    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-coral-600">Redes y relaciones</p><h1 className="font-display text-4xl text-pine-900">{type === 'genogram' ? 'Familiograma' : 'Ecomapa'}</h1><p className="mt-2 text-sm text-slate-500">{athlete ? `${athlete.firstNames} ${athlete.lastNames}` : ''} · estructura editable y disponible sin conexión.</p></div><div className="flex gap-3"><button className="btn-secondary" onClick={addNode}><Plus size={17}/> Agregar</button><button className="btn-primary" onClick={() => void save()}><Save size={17}/> Guardar</button></div></div>
    {message && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    <div className="card mt-6 overflow-hidden p-3 md:p-6"><svg viewBox="0 0 100 100" className="min-h-[420px] w-full rounded-2xl bg-sand-50" role="img" aria-label={type === 'genogram' ? 'Familiograma editable' : 'Ecomapa editable'}>
      {edges.map((edge) => { const source = nodeMap.get(edge.source); const target = nodeMap.get(edge.target); if (!source || !target) return null; const color = edge.relation === 'CONFLICTIVE' ? '#dc574c' : edge.relation === 'CLOSE' || edge.relation === 'STRONG' ? '#1f6b58' : '#77978e'; return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={color} strokeWidth={edge.relation === 'CLOSE' || edge.relation === 'STRONG' ? 1.5 : .7} strokeDasharray={edge.relation === 'DISTANT' || edge.relation === 'WEAK' ? '2 2' : undefined}/>; })}
      {nodes.map((node) => <g key={node.id}><circle cx={node.x} cy={node.y} r={node.id === 'athlete' ? 8 : 6} fill={node.id === 'athlete' ? '#285849' : '#fff'} stroke="#285849" strokeWidth=".8"/><text x={node.x} y={node.y + (node.id === 'athlete' ? 12 : 10)} textAnchor="middle" fontSize="3.2" fill="#18372f">{node.label.slice(0,26)}</text>{node.metadata?.livesTogether && <circle cx={node.x + 5} cy={node.y - 5} r="1.5" fill="#df7251"/>}</g>)}
    </svg></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{nodes.filter((node) => node.id !== 'athlete').map((node) => <article key={node.id} className="card p-4"><div className="flex gap-2"><input aria-label="Nombre del nodo" className="field" value={node.label} onChange={(e) => setNodes((current) => current.map((item) => item.id === node.id ? { ...item, label: e.target.value } : item))}/><button aria-label="Eliminar nodo" className="rounded-xl p-3 text-red-500 hover:bg-red-50" onClick={() => { setNodes((current) => current.filter((item) => item.id !== node.id)); setEdges((current) => current.filter((edge) => edge.source !== node.id && edge.target !== node.id)); }}><Trash2 size={18}/></button></div><select aria-label="Tipo de relación" className="field mt-3" value={edges.find((edge) => edge.source === node.id || edge.target === node.id)?.relation ?? 'ADEQUATE'} onChange={(e) => setEdges((current) => current.map((edge) => edge.source === node.id || edge.target === node.id ? { ...edge, relation: e.target.value } : edge))}>{type === 'genogram' ? <><option value="CLOSE">Cercana</option><option value="ADEQUATE">Adecuada</option><option value="DISTANT">Distante</option><option value="CONFLICTIVE">Conflictiva</option></> : <><option value="STRONG">Fuerte</option><option value="MODERATE">Moderada</option><option value="WEAK">Débil</option><option value="CONFLICTIVE">Conflictiva</option></>}</select></article>)}</div>
    <div className="mt-5 rounded-2xl bg-white p-4 text-xs leading-5 text-slate-500"><strong>Leyenda:</strong> línea gruesa = relación fuerte/cercana; línea punteada = débil/distante; línea roja = conflictiva; punto coral = convivencia.</div>
  </div>;
}
