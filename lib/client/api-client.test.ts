import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, clearTokens, post } from './api-client';

test('invalid public login preserves the error without refreshing or redirecting', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalFetch = globalThis.fetch;
  const values = new Map([['refresh_token', 'existing-session'], ['tenant_id', 'old-church']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => values.delete(key) };
  const location = { origin: 'http://localhost', href: '/login' };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return Response.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, { status: 401 });
  };
  try {
    await assert.rejects(post('/api/auth/login', {}, { skipAuth: true }), (error: unknown) => error instanceof ApiError && error.message === 'Invalid email or password');
    assert.equal(requests, 1);
    assert.equal(values.get('refresh_token'), 'existing-session');
    assert.equal(location.href, '/login');
    clearTokens();
    assert.equal(values.size, 0, 'sign out also clears the previous church context');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
