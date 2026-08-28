import { describe, expect, it } from 'vitest';
import { matchesConfigurableRule, validateScreeningResponses } from './index';
import { PERMISSIONS, ROLES } from './index';

describe('shared access vocabulary', () => {
  it('keeps roles and permissions as distinct concepts', () => {
    expect(ROLES.SOCIAL_WORKER).toBe('SOCIAL_WORKER');
    expect(PERMISSIONS.SOCIAL_RECORD_READ).toBe('social-record:read');
    expect(Object.values(ROLES)).not.toContain(PERMISSIONS.SOCIAL_RECORD_READ);
  });
});

describe('screening response validation', () => {
  const questions = [
    { id: 'q1', dimension: 'Apoyo', prompt: '¿Cuenta con apoyo?', type: 'YES_NO' as const, options: ['Sí', 'No'], required: true, position: 1 },
    { id: 'q2', dimension: 'Bienestar', prompt: 'Valoración', type: 'SCALE' as const, options: ['1', '2', '3'], required: true, position: 2 },
  ];

  it('rejects missing and invalid required answers when completing a screening', () => {
    expect(validateScreeningResponses(questions, { q1: 'Tal vez' })).toEqual([
      'La respuesta de “¿Cuenta con apoyo?” no corresponde a una opción válida.',
      'Falta responder: Valoración',
    ]);
  });

  it('accepts partial valid answers while a screening remains in progress', () => {
    expect(validateScreeningResponses(questions, { q1: 'Sí' }, false)).toEqual([]);
  });
});

describe('configurable alert rules', () => {
  it('keeps informed data separate and matches equality without clinical inference', () => {
    const matched = matchesConfigurableRule(
      { field: 'transportDifficulty', operator: 'EQUALS', expectedValue: 'FREQUENTLY' },
      { transportDifficulty: 'FREQUENTLY' },
    );
    expect(matched).toBe(true);
  });

  it('supports multiple-choice and numeric rules', () => {
    expect(matchesConfigurableRule({ field: 'networks', operator: 'INCLUDES', expectedValue: 'NONE' }, { networks: ['FAMILY', 'NONE'] })).toBe(true);
    expect(matchesConfigurableRule({ field: 'barriers', operator: 'GREATER_THAN', expectedValue: '2' }, { barriers: 3 })).toBe(true);
  });
});
