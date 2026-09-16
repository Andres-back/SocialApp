import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, setAccessToken } from './api';
import { db } from './db';

describe('api session renewal', () => {
  afterEach(async () => {
    setAccessToken(null);
    sessionStorage.removeItem('socialapp.sessionUser');
    await db.metadata.clear();
    vi.unstubAllGlobals();
  });

  it('refreshes an expired access token and retries the original request once', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Sesión vencida' }), { status: 401, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        accessToken: 'renewed-token',
        user: { id: 'user-1', email: 'social@example.com', displayName: 'Trabajo Social', roles: [], permissions: [] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('expired-token');

    await expect(api.health()).resolves.toEqual({ status: 'ok' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]![0]).toContain('/auth/refresh');
    const retriedHeaders = fetchMock.mock.calls[2]![1]!.headers as Headers;
    expect(retriedHeaders.get('Authorization')).toBe('Bearer renewed-token');
  });

  it('does not renew another account from shared browser cookies', async () => {
    sessionStorage.setItem('socialapp.sessionUser', JSON.stringify({ id: 'user-1' }));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: 'other-token', user: { id: 'user-2' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.refresh()).rejects.toMatchObject({ status: 409 });
    expect(sessionStorage.getItem('socialapp.accessToken')).toBeNull();
  });

  it('does not retry an invalid login with a different cookie session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Credenciales incorrectas' }), { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.login('first@example.com', 'incorrect')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never sends a replica owned by a different account', async () => {
    await db.metadata.put({ key: 'replica.owner', value: 'user-1', updatedAt: new Date().toISOString() });
    sessionStorage.setItem('socialapp.sessionUser', JSON.stringify({ id: 'user-2' }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.pushMutations([])).rejects.toMatchObject({ status: 409 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
