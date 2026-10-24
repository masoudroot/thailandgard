import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { isFactoryAuthorized } from '@/lib/factory/auth';

const token = 'x'.repeat(32);
process.env.FACTORY_DATABASE_URL = 'postgres://factory:factory@localhost:5433/factory';
process.env.FACTORY_CONTROL_TOKEN = token;

function request(authorization?: string): NextRequest {
  return new NextRequest('http://localhost/api/factory/work-items', {
    headers: authorization ? { authorization } : {},
  });
}

describe('isFactoryAuthorized', () => {
  it('accepts the bearer token', async () => {
    await expect(isFactoryAuthorized(request(`Bearer ${token}`))).resolves.toBe(true);
  });

  it('rejects a wrong bearer token', async () => {
    await expect(isFactoryAuthorized(request('Bearer wrong'))).resolves.toBe(false);
  });

  it('rejects a missing token', async () => {
    await expect(isFactoryAuthorized(request())).resolves.toBe(false);
  });

  it('rejects session auth for mutations when disabled', async () => {
    await expect(
      isFactoryAuthorized(request(), { allowSession: false }),
    ).resolves.toBe(false);
  });
});
