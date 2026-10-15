'use client';

import { useEffect } from 'react';

/**
 * اعمال تم ذخیره‌شدهٔ داشبورد (localStorage با کلید tg-theme) روی
 * اسکوپ .tg-dashboard، نه روی html تا تم سایت اصلی دست نخورد.
 */
export default function ThemeInit() {
  useEffect(() => {
    try {
      const t = localStorage.getItem('tg-theme');
      const dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.querySelector('.tg-dashboard')?.classList.toggle('dark', dark);
    } catch {
      /* ذخیره‌سازی در دسترس نیست؛ تم روشن می‌ماند */
    }
  }, []);
  return null;
}

/** تاگل تم برای استفادهٔ مشترک؛ کلاس dark را روی اسکوپ داشبورد می‌نشاند. */
export function toggleDashboardTheme(): boolean {
  const el = document.querySelector('.tg-dashboard');
  const next = !(el?.classList.contains('dark') ?? false);
  el?.classList.toggle('dark', next);
  try {
    localStorage.setItem('tg-theme', next ? 'dark' : 'light');
  } catch {
    /* نادیده */
  }
  return next;
}

/** آیا اسکوپ داشبورد الان تیره است؟ */
export function isDashboardDark(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector('.tg-dashboard')?.classList.contains('dark') ?? false;
}
