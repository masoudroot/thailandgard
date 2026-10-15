import { ok } from '../../../lib/dashboard/api';

export async function GET(): Promise<Response> {
  return ok({ status: 'ok' });
}
