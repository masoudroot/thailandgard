'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/dashboard/ui/Button';
import { PasswordInput } from '@/components/dashboard/ui/password-input';
import { toggleDashboardTheme, isDashboardDark } from '@/components/dashboard/ThemeInit';

/* تاگل سادهٔ تم: کلاس dark روی اسکوپ .tg-dashboard (نه html تا سایت دست نخورد). */
function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(isDashboardDark());
  }, []);

  function toggle() {
    setDark(toggleDashboardTheme());
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={toggle}
      aria-label={dark ? 'حالت روشن' : 'حالت تیره'}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </Button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError('رمز عبور را وارد کنید.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error ?? 'رمز عبور اشتباه است. دوباره تلاش کنید.');
      }
    } catch {
      setError('خطای اتصال. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-dvh flex bg-background pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] ps-4 pe-4"
    >
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] end-4">
        <ThemeToggle />
      </div>

      <div className="m-auto w-full max-w-sm animate-fade-in">
        <div className="rounded-xl bg-card border border-border p-6 sm:p-8 shadow-surface">
          <div className="flex items-center gap-3 mb-6">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-xl font-bold text-brand-foreground"
            >
              ت
            </span>
            <div>
              <h1 className="text-xl font-bold text-card-foreground">ورود به داشبورد</h1>
              <p className="text-sm text-muted-foreground">داشبورد ایجنتیک تایلندگرد</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-card-foreground">
                رمز عبور
              </label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور مدیر"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="tg-shake rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-7 text-destructive"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-base"
              disabled={loading}
            >
              {loading ? 'در حال بررسی…' : 'ورود'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          دسترسی محدود به تیم تایلندگرد
        </p>
      </div>
    </main>
  );
}
