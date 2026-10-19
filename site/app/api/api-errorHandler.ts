import { NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';

const logger = new Logger();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    logger.formatMessage(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.formatMessage(error);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    logger.formatMessage(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.formatMessage(error);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    logger.formatMessage(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.formatMessage(error);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

// اگر GET نیاز باشد (اختیاری) export async function GET() { return NextResponse.json({}); }