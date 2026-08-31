import { describe, expect, it } from 'vitest';
import { screeningInstrumentPath, SYSTEM_INSTRUMENTS, systemInstrumentPath } from './instrument-catalog';

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
});
