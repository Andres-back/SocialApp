import { describe, expect, it } from 'vitest';
import { matchesConfigurableRule } from './index';
import { PERMISSIONS, ROLES } from './index';

describe('shared access vocabulary', () => {
  it('keeps roles and permissions as distinct concepts', () => {
    expect(ROLES.SOCIAL_WORKER).toBe('SOCIAL_WORKER');
    expect(PERMISSIONS.SOCIAL_RECORD_READ).toBe('social-record:read');
    expect(Object.values(ROLES)).not.toContain(PERMISSIONS.SOCIAL_RECORD_READ);
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
