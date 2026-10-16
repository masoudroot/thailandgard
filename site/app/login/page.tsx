'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Moon, ShieldCheck, Sun, User } from 'lucide-react';
import { Button } from '@/components/dashboard/ui/Button';
import { Input } from '@/components/dashboard/ui/Input';
import { PasswordInput } from '@/components/dashboard/ui/password-input';
import { toggleDashboardTheme, isDashboardDark } from '@/components/dashboard/ThemeInit';

/* تاگل تم: کلاس dark روی اسکوپ .tg-dashboard (نه html تا سایت دست نخورد). */
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('نام کاربری و رمز عبور را وارد کنید.');
      setBlocked(false);
      return;
    }
    setLoading(true);
    setError('');
    setBlocked(false);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error ?? 'نام کاربری یا رمز عبور اشتباه است.');
        setBlocked(Boolean(data.blocked));
        setPassword('');
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
          {/* سربرگ */}
          <div className="flex items-center gap-3 mb-2">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-2xl font-bold text-brand-foreground"
            >
              ت
            </span>
            <div>
              <h1 className="text-xl font-bold text-card-foreground">ورود مدیر</h1>
              <p className="text-sm text-muted-foreground">داشبورد ایجنتیک تایلندگرد</p>
            </div>
          </div>

          <p className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="shrink-0" />
            این بخش فقط برای مدیر سامانه است
          </p>

          <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                نام کاربری
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                dir="ltr"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                disabled={loading}
                startAddon={
                  <User size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                }
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                رمز عبور
              </label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
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
              disabled={loading || blocked}
            >
              <LogIn size={18} aria-hidden="true" />
              {loading ? 'در حال بررسی…' : 'ورود به داشبورد'}
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
