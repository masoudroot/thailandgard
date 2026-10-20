import { createHash } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';

export function newId(): string {
  return uuidv7();
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
