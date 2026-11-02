import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertDatabaseEnvironment,
  postgrestWrite,
  projectRefFromUrl,
} from '@/lib/factory/tick/internal-api';

const ENV_KEY = 'EXPECTED_SUPABASE_PROJECT_REF';
const savedEnv = process.env[ENV_KEY];
const savedFetch = globalThis.fetch;

afterEach(() => {
  if (savedEnv === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = savedEnv;
  globalThis.fetch = savedFetch;
  vi.restoreAllMocks();
});

describe('projectRefFromUrl', () => {
  it('parses the ref from a supabase url', () => {
    expect(projectRefFromUrl('https://vpybkilbqeshcoqnbjba.supabase.co')).toBe(
      'vpybkilbqeshcoqnbjba',
    );
  });

  it('returns null for a non-supabase host', () => {
    expect(projectRefFromUrl('https://example.com')).toBeNull();
  });
});

describe('assertDatabaseEnvironment', () => {
  it('is open when the expected ref is not set', () => {
    delete process.env[ENV_KEY];
    expect(() =>
      assertDatabaseEnvironment({ url: 'https://anything.supabase.co', serviceKey: 'k' }),
    ).not.toThrow();
  });

  it('passes when the ref matches', () => {
    process.env[ENV_KEY] = 'lilmfiyzeeinmifhxdhj';
    expect(() =>
      assertDatabaseEnvironment({ url: 'https://lilmfiyzeeinmifhxdhj.supabase.co', serviceKey: 'k' }),
    ).not.toThrow();
  });

  it('throws a readable message on mismatch', () => {
    process.env[ENV_KEY] = 'vpybkilbqeshcoqnbjba';
    expect(() =>
      assertDatabaseEnvironment({ url: 'https://lilmfiyzeeinmifhxdhj.supabase.co', serviceKey: 'k' }),
    ).toThrow('نوشتن متوقف شد');
  });
});

describe('postgrestWrite guard', () => {
  it('never calls fetch on mismatch', async () => {
    process.env[ENV_KEY] = 'vpybkilbqeshcoqnbjba';
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(
      postgrestWrite(
        { url: 'https://lilmfiyzeeinmifhxdhj.supabase.co', serviceKey: 'k' },
        'POST',
        'content_documents',
        {},
      ),
    ).rejects.toThrow('نوشتن متوقف شد');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
