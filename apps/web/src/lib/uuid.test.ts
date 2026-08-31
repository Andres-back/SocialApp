import { describe, expect, it, vi } from 'vitest';
import { createId } from './uuid';

describe('createId', () => {
  it('creates UUIDs when randomUUID is available', () => {
    expect(createId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('falls back to getRandomValues on insecure HTTP origins', () => {
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
    const values = vi.spyOn(globalThis.crypto, 'getRandomValues');
    expect(createId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(values).toHaveBeenCalled();
    values.mockRestore();
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: original });
  });
});
