import { NextRequest, NextResponse } from 'next/server';
import { isFactoryAuthorized } from '@/lib/factory/auth';
import { getWorkItem } from '@/lib/factory/repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await isFactoryAuthorized(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const id = (await params).id;
  const item = await getWorkItem(id);
  if (!item) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ workItem: item });
}
