import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Logger } from '../../utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      Logger.error('Invalid request body');
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (!body.message) {
      Logger.error('Missing required field message');
      return NextResponse.json({ error: 'Missing required field' }, { status: 400 });
    }
    Logger.error(body.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    Logger.error('Server error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      Logger.error('Invalid request body');
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (!body.message) {
      Logger.error('Missing required field message');
      return NextResponse.json({ error: 'Missing required field' }, { status: 400 });
    }
    Logger.error(body.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    Logger.error('Server error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      Logger.error('Invalid request body');
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (!body.message) {
      Logger.error('Missing required field message');
      return NextResponse.json({ error: 'Missing required field' }, { status: 400 });
    }
    Logger.error(body.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    Logger.error('Server error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}