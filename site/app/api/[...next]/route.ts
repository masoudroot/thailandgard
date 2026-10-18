import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const email = searchParams.get('email');
  if (!name || !email) {
    const errorMsg = 'نام و ایمیل الزامی است';
    const logMsg = Logger.formatMessage(errorMsg, { level: 'error', context: 'api' });
    console.error(logMsg);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const errorMsg = 'ایمیل معتبر نیست';
    const logMsg = Logger.formatMessage(errorMsg, { level: 'error', context: 'api' });
    console.error(logMsg);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
  const userData = { name, email };
  const logMsg = Logger.formatMessage('کاربر جدید با موفقیت ثبت شد', { level: 'info', context: 'api' });
  console.log(logMsg);
  return NextResponse.json({ message: 'ثبت نام موفق', data: userData }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const email = searchParams.get('email');
  if (!name || !email) {
    const errorMsg = 'نام و ایمیل الزامی است';
    const logMsg = Logger.formatMessage(errorMsg, { level: 'error', context: 'api' });
    console.error(logMsg);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const errorMsg = 'ایمیل معتبر نیست';
    const logMsg = Logger.formatMessage(errorMsg, { level: 'error', context: 'api' });
    console.error(logMsg);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
  const userData = { name, email };
  const logMsg = Logger.formatMessage('کاربر با موفقیت به‌روزرسانی شد', { level: 'info', context: 'api' });
  console.log(logMsg);
  return NextResponse.json({ message: 'به‌روزرسانی موفق', data: userData }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    if (!name || !email) {
      const errorMsg = 'نام و ایمیل الزامی است';
      const logMsg = Logger.formatMessage(errorMsg, { level: 'error', context: 'api' });
      console.error(logMsg);
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorMsg = 'ایمیل معتبر نیست';
      const logMsg = Logger.formatMessage(errorMsg, { level: 'error', context: 'api' });
      console.error(logMsg);
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    const userData = { name, email };
    const logMsg = Logger.formatMessage('کاربر با موفقیت به‌روزرسانی شد', { level: 'info', context: 'api' });
    console.log(logMsg);
    return NextResponse.json({ message: 'به‌روزرسانی موفق', data: userData }, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = (error as Error).message;
    const logMsg = Logger.formatMessage(errorMsg, { level: 'error', context: 'api' });
    console.error(logMsg);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}