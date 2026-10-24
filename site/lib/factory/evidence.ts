import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`);
    return `{${entries.join(',')}}`;
  }
  const json = JSON.stringify(value);
  return json === undefined ? 'null' : json;
}

export function signEvidence(
  payload: Record<string, unknown>,
  secret: string,
): { hash: string; signature: string } {
  const canonical = canonicalize(payload);
  return {
    hash: createHash('sha256').update(canonical).digest('hex'),
    signature: createHmac('sha256', secret).update(canonical).digest('hex'),
  };
}

export function verifyEvidence(
  payload: Record<string, unknown>,
  signature: string,
  secret: string,
): boolean {
  const expected = signEvidence(payload, secret).signature;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}
