import { PERMISSIONS, type PermissionCode } from '@socialapp/shared';

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
}

export const SYSTEM_INSTRUMENTS: SystemInstrumentDefinition[] = [
  { kind: 'social-record', name: 'Ficha social y familiar', description: 'Composición familiar, persona cuidadora, relaciones y redes de apoyo.', area: 'Entorno familiar', version: 1, permission: PERMISSIONS.SOCIAL_RECORD_WRITE },
  { kind: 'socioeconomic-assessment', name: 'Caracterización socioeconómica', description: 'Vivienda, servicios, movilidad, alimentación, ingresos y valoración profesional.', area: 'Condiciones socioeconómicas', version: 1, permission: PERMISSIONS.ASSESSMENT_WRITE },
  { kind: 'alert-assessment', name: 'Registro y valoración de alertas', description: 'Indicadores informados, nivel preventivo y valoración de Trabajo Social.', area: 'Riesgos y alertas', version: 1, permission: PERMISSIONS.ALERT_WRITE },
  { kind: 'social-follow-up', name: 'Seguimiento e intervención social', description: 'Motivo, prioridad, acciones, acuerdos, responsables y próximas fechas.', area: 'Seguimiento', version: 1, permission: PERMISSIONS.FOLLOW_UP_WRITE },
  { kind: 'professional-observation', name: 'Observación profesional', description: 'Notas técnicas con fecha, tipo y nivel de visibilidad institucional.', area: 'Registro profesional', version: 1, permission: PERMISSIONS.FOLLOW_UP_WRITE },
  { kind: 'genogram', name: 'Familiograma', description: 'Representación editable de integrantes, vínculos y relaciones familiares.', area: 'Red familiar', version: 1, permission: PERMISSIONS.DIAGRAM_WRITE },
  { kind: 'ecomap', name: 'Ecomapa', description: 'Representación editable de redes, instituciones y calidad de los apoyos.', area: 'Redes de apoyo', version: 1, permission: PERMISSIONS.DIAGRAM_WRITE },
];

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
