import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../lib/logger';

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const level = params.get('level') as 'info' | 'error' | null || 'info';
    const message = params.get('message') || 'No message provided';
    logger[level](message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Logger API error', { error: error.message });
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { level = 'info', message, context, metadata } = body;
    if (typeof message !== 'string' || typeof level !== 'string' || !['info', 'error'].includes(level)) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }
    logger[level](message, context, metadata);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Logger POST error', { error: error.message });
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { level = 'info', message, context, metadata } = body;
    if (typeof message !== 'string' || typeof level !== 'string' || !['info', 'error'].includes(level)) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }
    logger[level](message, context, metadata);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Logger PUT error', { error: error.message });
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { level = 'info', message, context, metadata } = body;
    if (typeof message !== 'string' || typeof level !== 'string' || !['info', 'error'].includes(level)) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }
    logger[level](message, context, metadata);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Logger PATCH error', { error: error.message });
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}