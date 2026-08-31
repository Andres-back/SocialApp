import { PERMISSIONS, type PermissionCode, type SystemInstrumentConfigurationData, type SystemInstrumentQuestionData } from '@socialapp/shared';

export type SystemInstrumentKind =
  | 'social-record'
  | 'socioeconomic-assessment'
  | 'alert-assessment'
  | 'social-follow-up'
  | 'professional-observation'
  | 'genogram'
  | 'ecomap';

export interface SystemInstrumentDefinition {
  kind: SystemInstrumentKind;
  name: string;
  description: string;
  area: string;
  version: number;
  permission: PermissionCode;
  questions: SystemInstrumentQuestionData[];
}

const q = (id: string, prompt: string): SystemInstrumentQuestionData => ({ id, prompt });

export const SYSTEM_INSTRUMENTS: SystemInstrumentDefinition[] = [
  { kind: 'social-record', name: 'Ficha social y familiar', description: 'Composición familiar, persona cuidadora, relaciones y redes de apoyo.', area: 'Entorno familiar', version: 1, permission: PERMISSIONS.SOCIAL_RECORD_WRITE, questions: [q('livingWith','¿Con quién vive actualmente el deportista?'),q('householdMembers','¿Quiénes integran el hogar?'),q('primaryCaregiver','¿Quién es el cuidador principal?'),q('familyRelationships','¿Cómo considera actualmente las relaciones familiares?'),q('supportNetworks','Cuando necesita ayuda, ¿con qué redes de apoyo cuenta?'),q('professionalObservation','Observación profesional opcional')] },
  { kind: 'socioeconomic-assessment', name: 'Caracterización socioeconómica', description: 'Vivienda, servicios, movilidad, alimentación, ingresos y valoración profesional.', area: 'Condiciones socioeconómicas', version: 1, permission: PERMISSIONS.ASSESSMENT_WRITE, questions: [q('housingType','Tipo de vivienda'),q('housingTenure','Tenencia de la vivienda'),q('bedrooms','Número de dormitorios'),q('householdSize','Personas en la vivienda'),q('zone','Ubicación o zona'),q('utilities','Servicios disponibles'),q('exclusiveKitchen','¿Cuenta con espacio exclusivo para cocinar?'),q('transportMode','Desplazamiento habitual'),q('travelTime','Tiempo de desplazamiento'),q('transportDifficulty','¿El transporte dificulta la asistencia?'),q('foodReduction','¿Se redujo la cantidad o calidad de alimentos por falta de recursos durante el último mes?'),q('foodBeforeTraining','¿Consume algún alimento antes del entrenamiento?'),q('incomeRange','Ingreso familiar aproximado'),q('dependents','Personas dependientes'),q('informedObservation','Dato informado u observación familiar'),q('professionalAssessment','Valoración profesional de Trabajo Social')] },
  { kind: 'alert-assessment', name: 'Registro y valoración de alertas', description: 'Indicadores informados, nivel preventivo y valoración de Trabajo Social.', area: 'Riesgos y alertas', version: 1, permission: PERMISSIONS.ALERT_WRITE, questions: [q('informedData','Dato informado'),q('automaticIndicator','Indicador o motivo'),q('level','Nivel preventivo'),q('professionalAssessment','Valoración profesional')] },
  { kind: 'social-follow-up', name: 'Seguimiento e intervención social', description: 'Motivo, prioridad, acciones, acuerdos, responsables y próximas fechas.', area: 'Seguimiento', version: 1, permission: PERMISSIONS.FOLLOW_UP_WRITE, questions: [q('motive','Motivo del seguimiento'),q('priority','Prioridad'),q('estimatedDate','Próxima fecha'),q('situation','Situación identificada'),q('actions','Acciones realizadas'),q('agreements','Acuerdos'),q('nextDate','Fecha estimada')] },
  { kind: 'professional-observation', name: 'Observación profesional', description: 'Notas técnicas con fecha, tipo y nivel de visibilidad institucional.', area: 'Registro profesional', version: 1, permission: PERMISSIONS.FOLLOW_UP_WRITE, questions: [q('type','Tipo de observación'),q('visibility','Nivel de visibilidad'),q('observation','Observación profesional')] },
  { kind: 'genogram', name: 'Familiograma', description: 'Representación editable de integrantes, vínculos y relaciones familiares.', area: 'Red familiar', version: 1, permission: PERMISSIONS.DIAGRAM_WRITE, questions: [q('nodeLabel','Nombre del integrante'),q('relationship','Tipo de relación familiar')] },
  { kind: 'ecomap', name: 'Ecomapa', description: 'Representación editable de redes, instituciones y calidad de los apoyos.', area: 'Redes de apoyo', version: 1, permission: PERMISSIONS.DIAGRAM_WRITE, questions: [q('nodeLabel','Nombre de la red o institución'),q('relationship','Intensidad de la relación')] },
];

export function configuredSystemInstrument(definition: SystemInstrumentDefinition, configurations: SystemInstrumentConfigurationData[]): SystemInstrumentDefinition {
  const configuration = configurations.find((item) => item.kind === definition.kind);
  if (!configuration) return definition;
  const prompts = new Map(configuration.questions.map((question) => [question.id, question.prompt]));
  return {
    ...definition,
    version: configuration.version,
    questions: definition.questions.map((question) => ({ ...question, prompt: prompts.get(question.id) || question.prompt })),
  };
}

export function systemInstrumentPrompt(kind: SystemInstrumentKind, id: string, configurations: SystemInstrumentConfigurationData[]): string {
  const definition = SYSTEM_INSTRUMENTS.find((item) => item.kind === kind);
  if (!definition) return id;
  return configuredSystemInstrument(definition, configurations).questions.find((question) => question.id === id)?.prompt ?? id;
}

export function systemInstrumentPath(kind: SystemInstrumentKind, athleteId: string): string {
  const base = `/deportistas/${athleteId}`;
  if (kind === 'social-record') return `${base}/ficha-social`;
  if (kind === 'socioeconomic-assessment') return `${base}/caracterizacion`;
  if (kind === 'alert-assessment') return `${base}/trabajo-social?tab=alerts&new=1`;
  if (kind === 'social-follow-up') return `${base}/trabajo-social?tab=followups&new=1`;
  if (kind === 'professional-observation') return `${base}/trabajo-social?tab=observations&new=1`;
  if (kind === 'genogram') return `${base}/familiograma`;
  return `${base}/ecomapa`;
}

export function screeningInstrumentPath(instrumentId: string, athleteId: string): string {
  return `/brigadas/nueva?athleteId=${encodeURIComponent(athleteId)}&instrumentId=${encodeURIComponent(instrumentId)}`;
}
