import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save, WifiOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import type { AthleteInput, AthleteRecord, CatalogItem, SportsCatalogs } from '@socialapp/shared';
import { loadAthlete, loadCatalogs, saveAthleteOffline } from '../features/athletes/athlete-repository';
import { useConnection } from '../hooks/useConnection';

const optionalText = z.string().trim().max(180).optional();
const schema = z.object({
  internalCode: z.string().trim().max(40).optional(),
  documentType: z.enum(['CIVIL_REGISTRY', 'IDENTITY_CARD', 'PASSPORT', 'PERMIT', 'NONE', 'OTHER']),
  documentNumber: optionalText,
  firstNames: z.string().trim().min(2, 'Escribe los nombres.').max(120),
  lastNames: z.string().trim().max(120).optional(),
  birthDate: z.string().min(1, 'Selecciona la fecha de nacimiento.'),
  sex: z.enum(['FEMALE', 'MALE', 'INTERSEX', 'OTHER', 'PREFER_NOT_TO_SAY']),
  municipality: z.string().trim().max(120).optional(),
  zone: z.enum(['URBAN', 'RURAL']),
  sportsProgramId: z.string().optional(),
  sportId: z.string().optional(),
  categoryId: z.string().optional(),
  coachId: z.string().optional(),
  joinedAt: z.string().optional(),
  status: z.enum(['ACTIVE', 'RETIRED', 'SUSPENDED', 'OTHER']),
  schoolName: optionalText,
  schoolGrade: optionalText,
  schoolShift: optionalText,
  currentlyEnrolled: z.boolean(),
  guardianName: z.string().trim().max(160).refine((value) => !value || value.length >= 2, 'Escribe al menos 2 caracteres.').optional(),
  guardianRelationship: z.string().trim().max(80).refine((value) => !value || value.length >= 2, 'Escribe al menos 2 caracteres.').optional(),
  guardianPhone: z.string().trim().max(40).refine((value) => !value || value.length >= 7, 'Escribe al menos 7 caracteres.').optional(),
  guardianEmail: z.union([z.string().email('Escribe un correo válido.'), z.literal('')]).optional(),
});
type FormValues = z.infer<typeof schema>;

const inputClass = 'field mt-2';
function FieldError({ message }: { message?: string }) { return message ? <span className="mt-1 block text-xs text-red-600">{message}</span> : null; }

function includeCurrent(items: CatalogItem[], id: string | null | undefined, name: string | null | undefined) {
  if (!id || !name || items.some((item) => item.id === id)) return items;
  return [...items, { id, name }].sort((left, right) => left.name.localeCompare(right.name, 'es'));
}

function includeRetiredSelections(catalogs: SportsCatalogs, athlete: AthleteRecord): SportsCatalogs {
  return {
    programs: includeCurrent(catalogs.programs, athlete.sportsProgramId, athlete.sportsProgramName),
    sports: includeCurrent(catalogs.sports, athlete.sportId, athlete.sportName),
    categories: includeCurrent(catalogs.categories, athlete.categoryId, athlete.categoryName),
    coaches: includeCurrent(catalogs.coaches, athlete.coachId, athlete.coachName),
  };
}

export function AthleteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const online = useConnection();
  const [catalogs, setCatalogs] = useState<SportsCatalogs | null>(null);
  const [recordVersion, setRecordVersion] = useState(0);
  const [loadError, setLoadError] = useState('');
  const generatedCode = useMemo(() => `DEP-${Date.now().toString().slice(-6)}`, []);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      internalCode: generatedCode, documentType: 'NONE', documentNumber: '', firstNames: '', lastNames: '',
      birthDate: '', sex: 'PREFER_NOT_TO_SAY', municipality: '', zone: 'URBAN', sportsProgramId: '', sportId: '', categoryId: '',
      coachId: '', joinedAt: new Date().toISOString().slice(0, 10), status: 'ACTIVE', schoolName: '', schoolGrade: '',
      schoolShift: '', currentlyEnrolled: false, guardianName: '', guardianRelationship: '', guardianPhone: '', guardianEmail: '',
    },
  });

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const availableCatalogs = await loadCatalogs();
        if (!id) {
          if (!cancelled) setCatalogs(availableCatalogs);
          return;
        }
        const athlete = await loadAthlete(id);
        if (!athlete) {
          if (!cancelled) setLoadError('No encontramos este deportista en el dispositivo.');
          return;
        }
        if (cancelled) return;
        setCatalogs(includeRetiredSelections(availableCatalogs, athlete));
        setRecordVersion(athlete.version);
        reset({
          internalCode: athlete.internalCode, documentType: athlete.documentType, documentNumber: athlete.documentNumber ?? '',
          firstNames: athlete.firstNames, lastNames: athlete.lastNames, birthDate: athlete.birthDate, sex: athlete.sex,
          municipality: athlete.municipality, zone: athlete.zone, sportsProgramId: athlete.sportsProgramId, sportId: athlete.sportId,
          categoryId: athlete.categoryId, coachId: athlete.coachId ?? '', joinedAt: athlete.joinedAt, status: athlete.status,
          schoolName: athlete.schoolName ?? '', schoolGrade: athlete.schoolGrade ?? '', schoolShift: athlete.schoolShift ?? '',
          currentlyEnrolled: athlete.currentlyEnrolled, guardianName: athlete.guardian.name,
          guardianRelationship: athlete.guardian.relationship, guardianPhone: athlete.guardian.phone, guardianEmail: athlete.guardian.email ?? '',
        });
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'No fue posible cargar los catálogos.');
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, [id, reset]);

  async function submit(values: FormValues) {
    if (!catalogs) return setLoadError('Los catálogos no están disponibles.');
    const catalogFallback = (items: CatalogItem[]) => items.find((item) => item.name === 'Por definir')?.id ?? items[0]?.id ?? '';
    const sportsProgramId = values.sportsProgramId || catalogFallback(catalogs.programs);
    const sportId = values.sportId || catalogFallback(catalogs.sports);
    const categoryId = values.categoryId || catalogFallback(catalogs.categories);
    if (!sportsProgramId || !sportId || !categoryId) return setLoadError('Configura al menos una opción de programa, deporte y categoría.');
    const athleteId = id ?? crypto.randomUUID();
    const hasGuardian = Boolean(values.guardianName || values.guardianRelationship || values.guardianPhone || values.guardianEmail);
    const input: AthleteInput = {
      id: athleteId, internalCode: values.internalCode || generatedCode, documentType: values.documentType,
      documentNumber: values.documentType === 'NONE' ? null : values.documentNumber || null,
      firstNames: values.firstNames, lastNames: values.lastNames || 'Por definir', birthDate: values.birthDate, sex: values.sex,
      municipality: values.municipality || 'Por definir', zone: values.zone, sportsProgramId, sportId,
      categoryId, coachId: values.coachId || null, joinedAt: values.joinedAt || new Date().toISOString().slice(0, 10), status: values.status,
      schoolName: values.schoolName || null, schoolGrade: values.schoolGrade || null, schoolShift: values.schoolShift || null,
      currentlyEnrolled: values.currentlyEnrolled,
      ...(hasGuardian ? { guardian: { name: values.guardianName || '', relationship: values.guardianRelationship || '', phone: values.guardianPhone || '', email: values.guardianEmail || null } } : {}),
      version: recordVersion,
    };
    const saved = await saveAthleteOffline(input, catalogs);
    const message = !online
      ? 'Guardado en este dispositivo. Se sincronizará al volver la conexión.'
      : saved.syncStatus === 'synced'
        ? 'Deportista guardado y sincronizado.'
        : 'Deportista guardado. La sincronización se reintentará automáticamente.';
    navigate(`/deportistas/${athleteId}`, { state: { message } });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to={id ? `/deportistas/${id}` : '/deportistas'} className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700"><ArrowLeft size={17} /> Volver</Link>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-coral-600">Expediente único</p><h1 className="mt-1 font-display text-4xl text-pine-900">{id ? 'Editar deportista' : 'Nuevo deportista'}</h1><p className="mt-2 text-sm text-slate-500">Solo nombres y fecha de nacimiento son obligatorios. Puedes completar el resto después.</p></div>{!online && <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800"><WifiOff size={15} /> Guardado sin conexión</span>}</div>
      {loadError && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}
      <form className="mt-7 space-y-6" onSubmit={handleSubmit(submit)}>
        <FormSection title="Identificación" description="Datos básicos para reconocer al deportista.">
          <label><span className="text-sm font-semibold text-slate-700">Código interno (automático)</span><input className={inputClass} placeholder="Se genera automáticamente" {...register('internalCode')} /><FieldError message={errors.internalCode?.message} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Tipo de documento</span><select className={inputClass} {...register('documentType')}><option value="NONE">No informado</option><option value="CIVIL_REGISTRY">Registro civil</option><option value="IDENTITY_CARD">Tarjeta de identidad</option><option value="PASSPORT">Pasaporte</option><option value="PERMIT">Permiso</option><option value="OTHER">Otro</option></select></label>
          <label><span className="text-sm font-semibold text-slate-700">Número de documento</span><input className={inputClass} {...register('documentNumber')} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Nombres *</span><input className={inputClass} {...register('firstNames')} /><FieldError message={errors.firstNames?.message} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Apellidos</span><input className={inputClass} {...register('lastNames')} /><FieldError message={errors.lastNames?.message} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Fecha de nacimiento *</span><input type="date" max={new Date().toISOString().slice(0, 10)} className={inputClass} {...register('birthDate')} /><FieldError message={errors.birthDate?.message} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Sexo</span><select className={inputClass} {...register('sex')}><option value="PREFER_NOT_TO_SAY">No informado</option><option value="FEMALE">Femenino</option><option value="MALE">Masculino</option><option value="INTERSEX">Intersexual</option><option value="OTHER">Otro</option></select></label>
          <label><span className="text-sm font-semibold text-slate-700">Municipio</span><input className={inputClass} {...register('municipality')} /><FieldError message={errors.municipality?.message} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Zona</span><select className={inputClass} {...register('zone')}><option value="URBAN">Urbana / por definir</option><option value="RURAL">Rural</option></select></label>
        </FormSection>
        <FormSection title="Información deportiva" description="Vinculación actual al programa.">
          <CatalogSelect label="Programa" items={catalogs?.programs} registration={register('sportsProgramId')} error={errors.sportsProgramId?.message} />
          <CatalogSelect label="Deporte" items={catalogs?.sports} registration={register('sportId')} error={errors.sportId?.message} />
          <CatalogSelect label="Categoría" items={catalogs?.categories} registration={register('categoryId')} error={errors.categoryId?.message} />
          <CatalogSelect label="Entrenador" items={catalogs?.coaches} registration={register('coachId')} />
          <label><span className="text-sm font-semibold text-slate-700">Fecha de ingreso</span><input type="date" className={inputClass} {...register('joinedAt')} /><FieldError message={errors.joinedAt?.message} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Estado</span><select className={inputClass} {...register('status')}><option value="ACTIVE">Activo</option><option value="RETIRED">Retirado</option><option value="SUSPENDED">Suspendido</option><option value="OTHER">Otro</option></select></label>
        </FormSection>
        <FormSection title="Información educativa" description="Datos básicos de escolarización.">
          <label className="flex min-h-12 items-center gap-3 rounded-xl bg-sand-50 px-4"><input type="checkbox" className="h-5 w-5 accent-pine-700" {...register('currentlyEnrolled')} /><span className="text-sm font-semibold text-slate-700">Actualmente escolarizado</span></label>
          <label><span className="text-sm font-semibold text-slate-700">Institución educativa</span><input className={inputClass} {...register('schoolName')} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Grado</span><input className={inputClass} {...register('schoolGrade')} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Jornada</span><input className={inputClass} {...register('schoolShift')} /></label>
        </FormSection>
        <FormSection title="Acudiente" description="Persona principal de contacto.">
          <label><span className="text-sm font-semibold text-slate-700">Nombre completo</span><input className={inputClass} {...register('guardianName')} /><FieldError message={errors.guardianName?.message} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Parentesco</span><input className={inputClass} {...register('guardianRelationship')} /><FieldError message={errors.guardianRelationship?.message} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Teléfono</span><input type="tel" className={inputClass} {...register('guardianPhone')} /><FieldError message={errors.guardianPhone?.message} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Correo</span><input type="email" className={inputClass} {...register('guardianEmail')} /><FieldError message={errors.guardianEmail?.message} /></label>
        </FormSection>
        <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-white bg-white/90 p-4 shadow-soft backdrop-blur"><button className="btn-primary w-full sm:w-auto" disabled={isSubmitting || !catalogs}><Save size={18} /> {isSubmitting ? 'Guardando…' : 'Guardar deportista'}</button></div>
      </form>
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="card p-5 md:p-7"><div className="mb-6"><h2 className="font-display text-2xl text-pine-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{children}</div></section>;
}

function CatalogSelect({ label, items, registration, error }: { label: string; items?: { id: string; name: string }[]; registration: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>; error?: string }) {
  return <label><span className="text-sm font-semibold text-slate-700">{label}</span><select className={inputClass} {...registration}><option value="">Seleccionar…</option>{items?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><FieldError message={error} /></label>;
}
