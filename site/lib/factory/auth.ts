import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/dashboard/auth';
import { loadFactoryConfig } from './config';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface FactoryAuthOptions {
  allowSession?: boolean;
}

export async function isFactoryAuthorized(
  request: NextRequest,
  options: FactoryAuthOptions = {},
): Promise<boolean> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();

  if (token && safeEqual(token, loadFactoryConfig().controlToken)) {
    return true;
  }

  if (options.allowSession === false) return false;
  return isAuthenticated(request);
}
