import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, setAccessToken } from './api';

describe('api session renewal', () => {
  afterEach(() => {
    setAccessToken(null);
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
});
