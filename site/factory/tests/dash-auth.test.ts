import { describe, expect, it, afterEach } from 'vitest';
import { hashSync } from 'bcryptjs';
import { getDashboardGate } from '@/lib/factory-dashboard/gate';
import { countByStatus } from '@/lib/factory-dashboard/data';
import { adminSessionValue } from '@/lib/dashboard/admin-auth';

const SAVED_USER = process.env.ADMIN_USERNAME;
const SAVED_HASH = process.env.ADMIN_PASSWORD_HASH;

afterEach(() => {
  if (SAVED_USER === undefined) delete process.env.ADMIN_USERNAME;
  else process.env.ADMIN_USERNAME = SAVED_USER;
  if (SAVED_HASH === undefined) delete process.env.ADMIN_PASSWORD_HASH;
  else process.env.ADMIN_PASSWORD_HASH = SAVED_HASH;
});

describe('داشبورد کارخانه: گیت احراز هویت', () => {
  it('بدون کوکی، login می‌دهد', async () => {
    await expect(getDashboardGate(undefined)).resolves.toBe('login');
  });

  it('توکن نادرست، login می‌دهد', async () => {
    await expect(getDashboardGate('not-a-valid-session')).resolves.toBe('login');
  });

  it('وقتی احراز هویت پیکربندی نشده است، login می‌دهد', async () => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD_HASH;
    await expect(getDashboardGate('anything')).resolves.toBe('login');
  });

  it('توکن سشن معتبر، allow می‌دهد', async () => {
    process.env.ADMIN_USERNAME = 'dash-test-admin';
    process.env.ADMIN_PASSWORD_HASH = hashSync('dash-test-pass', 10);
    const session = await adminSessionValue();
    expect(session).not.toBeNull();
    await expect(getDashboardGate(session ?? undefined)).resolves.toBe('allow');
  });
});

describe('داشبورد کارخانه: شمارش وضعیت‌ها', () => {
  it('وضعیت‌ها را می‌شمرد و مرتب برمی‌گرداند', () => {
    expect(
      countByStatus(['queued', 'succeeded', 'queued', 'blocked', 'succeeded', 'succeeded']),
    ).toEqual([
      { status: 'blocked', count: 1 },
      { status: 'queued', count: 2 },
      { status: 'succeeded', count: 3 },
    ]);
  });

  it('ورودی خالی، فهرست خالی می‌دهد', () => {
    expect(countByStatus([])).toEqual([]);
  });
});
