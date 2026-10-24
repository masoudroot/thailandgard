import { describe, expect, it } from 'vitest';
import { loadFactoryConfig } from '@/lib/factory/config';

const base = {
  FACTORY_ENV: 'local',
  FACTORY_DATABASE_URL: 'postgres://factory:***@localhost:5433/factory',
  FACTORY_CONTROL_TOKEN: 'x'.repeat(32),
};

describe('loadFactoryConfig', () => {
  it('loads a valid configuration', () => {
    const config = loadFactoryConfig(base);
    expect(config.databaseUrl).toBe(base.FACTORY_DATABASE_URL);
    expect(config.controlToken).toHaveLength(32);
    expect(config.artifactDir).toBeUndefined();
    expect(config.artifacts).toBeUndefined();
  });

  it('accepts a filesystem artifact directory', () => {
    const config = loadFactoryConfig({
      ...base,
      FACTORY_ARTIFACT_DIR: '/tmp/factory-artifacts',
    });
    expect(config.artifactDir).toBe('/tmp/factory-artifacts');
  });

  it('requires artifact settings to be provided together', () => {
    expect(() =>
      loadFactoryConfig({ ...base, FACTORY_ARTIFACT_BUCKET: 'factory' }),
    ).toThrow(/together/);
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
