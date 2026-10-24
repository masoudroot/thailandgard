import { NextRequest, NextResponse } from 'next/server';
import { CreateWorkItemRequestSchema } from '@/lib/factory/api';
import { isFactoryAuthorized } from '@/lib/factory/auth';
import { createWorkItem } from '@/lib/factory/repository';

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await isFactoryAuthorized(request, { allowSession: false }))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateWorkItemRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const item = await createWorkItem(input);

  // Execution is dispatched by the factory runtime; the same in-process
  // runner hosts work items locally and inside GitHub Actions.
  return NextResponse.json({ workItem: item }, { status: 202 });
}
