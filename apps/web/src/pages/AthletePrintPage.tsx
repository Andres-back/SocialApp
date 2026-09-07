import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AthleteRecord } from '@socialapp/shared';
import { loadAthlete } from '../features/athletes/athlete-repository';
import { api } from '../lib/api';

const documentTypeLabels = { CIVIL_REGISTRY: 'Registro civil', IDENTITY_CARD: 'Tarjeta de identidad', PASSPORT: 'Pasaporte', PERMIT: 'Permiso', NONE: 'No informado', OTHER: 'Otro' };
const sexLabels = { FEMALE: 'Femenino', MALE: 'Masculino', INTERSEX: 'Intersexual', OTHER: 'Otro', PREFER_NOT_TO_SAY: 'No informado' };
const zoneLabels = { UNSPECIFIED: 'Sin informar', URBAN: 'Urbana', RURAL: 'Rural' };
const statusLabels = { ACTIVE: 'Activo', RETIRED: 'Retirado', SUSPENDED: 'Suspendido', OTHER: 'Otro' };

function dateLabel(value?: string | null) {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? day + '/' + month + '/' + year : value;
}

export function AthletePrintPage() {
  const [searchParams] = useSearchParams();
  const athleteId = searchParams.get('athleteId') ?? '';
  const [athlete, setAthlete] = useState<AthleteRecord>();
  const [loaded, setLoaded] = useState(!athleteId);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!athleteId) return;
    let active = true;
    loadAthlete(athleteId)
      .then((item) => { if (!active) return; if (item) setAthlete(item); else setError('No encontramos este deportista.'); })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : 'No fue posible cargar el deportista.'))
      .finally(() => active && setLoaded(true));
    return () => { active = false; };
  }, [athleteId]);
  const generatedAt = useMemo(() => new Date().toLocaleString('es-CO'), []);
  async function print() {
    await api.auditExport(athlete ? 'AthleteRegistrationCompleted' : 'AthleteRegistrationBlank', athlete?.id).catch(() => undefined);
    window.print();
  }
  if (!loaded) return <div className="p-12 text-center text-sm text-slate-500">Preparando ficha de registro…</div>;
  if (athleteId && !athlete) return <div className="card p-10 text-center"><h1 className="font-display text-3xl text-pine-900">Ficha no disponible</h1><p className="mt-2 text-sm text-slate-500">{error}</p><Link to="/deportistas" className="btn-secondary mt-6">Volver a deportistas</Link></div>;

  return <div className="mx-auto max-w-5xl bg-white p-5 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link to={athlete ? '/deportistas/' + athlete.id : '/deportistas'} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17}/> Volver a deportistas</Link><button className="btn-primary" onClick={() => void print()}><Printer size={18}/> Imprimir / Guardar PDF</button></div>
    <header className="mt-6 border-b-2 border-pine-800 pb-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral-600">Programa de Trabajo Social · {athlete ? 'Ficha diligenciada' : 'Formato en blanco'}</p><h1 className="mt-2 font-display text-4xl text-pine-900">Registro de deportista</h1><p className="mt-2 text-sm text-slate-500">Expediente único de la población deportiva{athlete ? ' · Versión ' + athlete.version : ''}</p></header>

    <PrintSection title="Identificación">
      <PrintField label="Código interno" value={athlete?.internalCode}/><PrintField label="Número de documento" value={athlete?.documentNumber}/>
      <PrintField label="Nombres" value={athlete?.firstNames}/><PrintField label="Apellidos" value={athlete?.lastNames}/>
      <PrintField label="Fecha de nacimiento" value={dateLabel(athlete?.birthDate)}/><PrintField label="Edad" value={athlete ? String(athlete.age) + ' años' : ''}/>
      <PrintField label="Municipio" value={athlete?.municipality}/>
      <ChoiceField label="Tipo de documento" options={Object.values(documentTypeLabels)} selected={athlete ? documentTypeLabels[athlete.documentType] : undefined}/>
      <ChoiceField label="Sexo" options={Object.values(sexLabels)} selected={athlete ? sexLabels[athlete.sex] : undefined}/>
      <ChoiceField label="Zona" options={Object.values(zoneLabels)} selected={athlete ? zoneLabels[athlete.zone] : undefined}/>
    </PrintSection>

    <PrintSection title="Información deportiva">
      <PrintField label="Programa" value={athlete?.sportsProgramName}/><PrintField label="Deporte" value={athlete?.sportName}/>
      <PrintField label="Categoría" value={athlete?.categoryName}/><PrintField label="Entrenador" value={athlete?.coachName}/>
      <PrintField label="Fecha de ingreso" value={dateLabel(athlete?.joinedAt)}/>
      <ChoiceField label="Estado" options={Object.values(statusLabels)} selected={athlete ? statusLabels[athlete.status] : undefined}/>
    </PrintSection>

    <PrintSection title="Información educativa">
      <ChoiceField label="Actualmente escolarizado" options={['Sí', 'No']} selected={athlete ? athlete.currentlyEnrolled ? 'Sí' : 'No' : undefined}/>
      <PrintField label="Institución educativa" value={athlete?.schoolName}/><PrintField label="Grado" value={athlete?.schoolGrade}/><PrintField label="Jornada" value={athlete?.schoolShift}/>
    </PrintSection>

    <PrintSection title="Acudiente">
      <PrintField label="Nombre completo" value={athlete?.guardian.name}/><PrintField label="Parentesco" value={athlete?.guardian.relationship}/>
      <PrintField label="Teléfono" value={athlete?.guardian.phone}/><PrintField label="Correo" value={athlete?.guardian.email}/>
    </PrintSection>

    <section className="mt-8 break-inside-avoid grid gap-10 border-t border-slate-300 pt-12 sm:grid-cols-2"><div className="border-t border-slate-500 pt-2 text-center text-xs text-slate-500">Firma del profesional responsable</div><div className="border-t border-slate-500 pt-2 text-center text-xs text-slate-500">Firma del deportista o acudiente</div></section>
    <footer className="mt-8 border-t pt-3 text-xs text-slate-400">Formato generado el {generatedAt}. {athlete?.updatedAt ? 'Datos actualizados el ' + new Date(athlete.updatedAt).toLocaleString('es-CO') + '.' : 'Complete los campos con letra legible.'}</footer>
  </div>;
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6 break-inside-avoid rounded-xl border border-slate-300 p-5"><h2 className="border-b border-slate-200 pb-2 font-display text-2xl text-pine-900">{title}</h2><div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">{children}</div></section>;
}

function PrintField({ label, value }: { label: string; value?: string | null }) {
  return <div className="min-h-12"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>{value ? <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p> : <div className="mt-5 border-b border-slate-500"/>}</div>;
}

function ChoiceField({ label, options, selected }: { label: string; options: string[]; selected?: string }) {
  return <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{options.map((option) => <span key={option} className="text-sm text-slate-700">{selected === option ? '☒' : '☐'} {option}</span>)}</div></div>;
}
