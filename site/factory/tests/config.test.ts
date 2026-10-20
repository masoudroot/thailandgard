import { describe, expect, it } from 'vitest';
import { loadFactoryConfig } from '@/lib/factory/config';

const base = {
  FACTORY_ENV: 'local',
  FACTORY_DATABASE_URL: 'postgres://factory:factory@localhost:5433/factory',
  FACTORY_CONTROL_TOKEN: 'x'.repeat(32),
  TEMPORAL_ADDRESS: 'localhost:7233',
  TEMPORAL_NAMESPACE: 'default',
  FACTORY_TASK_QUEUE: 'factory-orchestration',
};

describe('loadFactoryConfig', () => {
  it('loads a valid configuration', () => {
    const config = loadFactoryConfig(base);
    expect(config.databaseUrl).toBe(base.FACTORY_DATABASE_URL);
    expect(config.taskQueue).toBe('factory-orchestration');
    expect(config.controlToken).toHaveLength(32);
  });

  it('rejects a short control token', () => {
    expect(() =>
      loadFactoryConfig({ ...base, FACTORY_CONTROL_TOKEN: 'short' }),
    ).toThrow(/FACTORY_CONTROL_TOKEN/);
  });

  it('rejects a missing database URL', () => {
    expect(() =>
      loadFactoryConfig({ ...base, FACTORY_DATABASE_URL: '' }),
    ).toThrow(/FACTORY_DATABASE_URL/);
  });
});
