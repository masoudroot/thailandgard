import { describe, expect, it } from 'vitest';
import { loadFactoryConfig } from '@/lib/factory/config';

const base = {
  FACTORY_ENV: 'local',
  FACTORY_DATABASE_URL: 'postgres://factory:factory@localhost:5433/factory',
  FACTORY_CONTROL_TOKEN: 'x'.repeat(32),
};

describe('evidence secret config', () => {
  it('is optional', () => {
    expect(loadFactoryConfig(base).evidenceSecret).toBeUndefined();
  });

  it('rejects a short secret', () => {
    expect(() =>
      loadFactoryConfig({ ...base, FACTORY_EVIDENCE_SECRET: 'short' }),
    ).toThrow(/FACTORY_EVIDENCE_SECRET/);
  });
});
