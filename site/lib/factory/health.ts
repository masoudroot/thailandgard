export interface HealthDependencies {
  dbCheck: () => Promise<void>;
}

export interface FactoryHealth {
  ok: boolean;
  db: 'ok' | 'error';
}

export async function checkFactoryHealth(
  dependencies: HealthDependencies,
): Promise<FactoryHealth> {
  try {
    await dependencies.dbCheck();
    return { ok: true, db: 'ok' };
  } catch {
    return { ok: false, db: 'error' };
  }
}