export interface HealthDependencies {
  dbCheck: () => Promise<void>;
  temporalCheck: () => Promise<void>;
}

export interface FactoryHealth {
  ok: boolean;
  db: 'ok' | 'error';
  temporal: 'ok' | 'error';
}

export async function checkFactoryHealth(
  dependencies: HealthDependencies,
): Promise<FactoryHealth> {
  const [db, temporal] = await Promise.allSettled([
    dependencies.dbCheck(),
    dependencies.temporalCheck(),
  ]);

  return {
    ok: db.status === 'fulfilled' && temporal.status === 'fulfilled',
    db: db.status === 'fulfilled' ? 'ok' : 'error',
    temporal: temporal.status === 'fulfilled' ? 'ok' : 'error',
  };
}
