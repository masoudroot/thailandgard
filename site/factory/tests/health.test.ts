import { describe, expect, it } from 'vitest';
import { checkFactoryHealth } from '@/lib/factory/health';

describe('checkFactoryHealth', () => {
  it('reports healthy dependencies', async () => {
    const health = await checkFactoryHealth({
      dbCheck: async () => undefined,
    });
    expect(health.ok).toBe(true);
    expect(health.db).toBe('ok');
  });

  it('reports a failed dependency', async () => {
    const health = await checkFactoryHealth({
      dbCheck: async () => {
        throw new Error('db down');
      },
    });
    expect(health.ok).toBe(false);
    expect(health.db).toBe('error');
  });
});