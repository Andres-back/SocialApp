import { describe, expect, it } from 'vitest';
import { configuredSystemInstrument, screeningInstrumentPath, SYSTEM_INSTRUMENTS, systemInstrumentPath } from './instrument-catalog';

describe('instrument catalog', () => {
  it('contains every social-work form except athlete registration', () => {
    expect(SYSTEM_INSTRUMENTS.map((item) => item.kind)).toEqual([
      'social-record', 'socioeconomic-assessment', 'alert-assessment', 'social-follow-up',
      'professional-observation', 'genogram', 'ecomap',
    ]);
  });

  it('routes every instrument to its application flow', () => {
    expect(systemInstrumentPath('social-follow-up', 'athlete-1')).toBe('/deportistas/athlete-1/trabajo-social?tab=followups&new=1');
    expect(screeningInstrumentPath('instrument 1', 'athlete/1')).toBe('/brigadas/nueva?athleteId=athlete%2F1&instrumentId=instrument%201');
  });

  it('applies synchronized prompts without changing protected field identifiers', () => {
    const definition = SYSTEM_INSTRUMENTS.find((item) => item.kind === 'social-record')!;
    const configured = configuredSystemInstrument(definition, [{
      kind: 'social-record',
      version: 3,
      questions: [{ id: 'livingWith', prompt: '¿Con quién convive actualmente?' }],
    }]);

    expect(configured.version).toBe(3);
    expect(configured.questions.find((item) => item.id === 'livingWith')?.prompt).toBe('¿Con quién convive actualmente?');
    expect(configured.questions.find((item) => item.id === 'primaryCaregiver')?.prompt).toBe('¿Quién es el cuidador principal?');
  });
});
