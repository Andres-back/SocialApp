import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@socialapp/shared';
import { hasEveryPermission } from './permission-match';

describe('permission matching', () => {
  it('requires every declared permission', () => {
    expect(hasEveryPermission([PERMISSIONS.ATHLETE_READ], [PERMISSIONS.ATHLETE_READ])).toBe(true);
    expect(hasEveryPermission([PERMISSIONS.ATHLETE_READ], [PERMISSIONS.ATHLETE_READ, PERMISSIONS.SOCIAL_RECORD_READ])).toBe(false);
  });
  it('does not grant sensitive social access from athlete access', () => {
    expect(hasEveryPermission([PERMISSIONS.ATHLETE_READ], [PERMISSIONS.SOCIAL_RECORD_READ])).toBe(false);
  });
});

