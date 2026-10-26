import { describe, expect, it, vi } from 'vitest';
import { decide, formatAlert, probeTarget, sendTelegram, TARGETS, REMINDER_MS } from '../scripts/uptime-probe.mjs';

const okResult = (name: string) => ({ name, label: name, url: `https://example.test/${name}`, ok: true, detail: 'HTTP 200' });
const badResult = (name: string) => ({ name, label: name, url: `https://example.test/${name}`, ok: false, detail: 'HTTP 503' });

describe('uptime probe: targets', () => {
  it('covers health, home and one tour page', () => {
    expect(TARGETS.map((t: { name: string }) => t.name)).toEqual(['health', 'home', 'tour']);
  });

  it('health target rejects a body without status ok', () => {
    const health = TARGETS.find((t: { name: string }) => t.name === 'health')!;
    expect(health.ok('{"status":"ok"}')).toBe(true);
    expect(health.ok('{"status":"degraded"}')).toBe(false);
  });
});

describe('uptime probe: retries', () => {
  it('succeeds on a later attempt and stops retrying', async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"status":"ok"}',
    });
    const result = await probeTarget(TARGETS[0], { fetchImpl, delayMs: 0 });
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('reports failure only after three failed attempts', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => '' });
    const result = await probeTarget(TARGETS[0], { fetchImpl, delayMs: 0 });
    expect(result.ok).toBe(false);
    expect(result.detail).toBe('HTTP 503');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('treats wrong page content as failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'just a moment' });
    const result = await probeTarget(TARGETS[1], { fetchImpl, attempts: 1, delayMs: 0 });
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('محتوا');
  });
});

describe('uptime probe: alert state machine', () => {
  const now = Date.parse('2026-10-26T10:00:00Z');

  it('opens an alert when down and no issue exists', () => {
    expect(decide([okResult('home'), badResult('health')], null, now)).toBe('create');
  });

  it('stays quiet while an issue is open and fresh', () => {
    expect(decide([badResult('health')], { number: 7, updatedAt: now - 60_000 }, now)).toBe('none');
  });

  it('reminds after six hours of downtime', () => {
    expect(decide([badResult('health')], { number: 7, updatedAt: now - REMINDER_MS - 1 }, now)).toBe('remind');
  });

  it('recovers and closes when everything is healthy again', () => {
    expect(decide([okResult('health'), okResult('home')], { number: 7, updatedAt: now }, now)).toBe('recover');
  });

  it('does nothing when healthy and no issue exists', () => {
    expect(decide([okResult('health')], null, now)).toBe('none');
  });
});

describe('uptime probe: messages', () => {
  it('includes every target and the failures', () => {
    const text = formatAlert('create', [okResult('home'), badResult('health')], Date.parse('2026-10-26T10:00:00Z'));
    expect(text).toContain('سایت در دسترس نیست');
    expect(text).toContain('home');
    expect(text).toContain('HTTP 503');
  });

  it('marks recovery clearly', () => {
    expect(formatAlert('recover', [okResult('health')])).toContain('سالم شد');
  });
});

describe('uptime probe: telegram channel', () => {
  it('skips when secrets are missing', async () => {
    const fetchImpl = vi.fn();
    expect(await sendTelegram('x', { token: '', chatId: '', fetchImpl })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts to the bot API when configured', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    expect(await sendTelegram('x', { token: 't', chatId: '1', fetchImpl })).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.telegram.org/bott/sendMessage', expect.objectContaining({ method: 'POST' }));
  });
});
