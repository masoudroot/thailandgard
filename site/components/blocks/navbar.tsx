"use client";

/**
 * نوبار. دست‌ساز می‌ماند: نزدیک‌ترین آیتم رجیستری دکمه‌های بدون href دارد؛
 * این نسخه دکمه‌ها را hrefپذیر کرده (asChild روی Button) تا لینک‌ها
 * معتبر بمانند و در موبایل با کلیک، شیت هم بسته شود.
 */

import * as React from "react";
import { Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface NavLink { label: string; href: string; active?: boolean }

export interface NavbarProps {
  logo: React.ReactNode;
  /** Where the logo points. */
  homeHref?: string;
  links: NavLink[];
  primary?: { label: string; href?: string };
  secondary?: { label: string; href?: string };
  /** Sticks to the top with a blurred background. */
  sticky?: boolean;
  /** Optional tel: link; renders a persistent call icon on mobile. */
  callHref?: string;
  className?: string;
}

/** نوار بالا. Logo on the right, links in the middle, actions on the left; a sheet from the right on mobile. */
/* حکم ۱۵ design-ir (۲۰ مهر ۱۴۰۵، لازم‌الاجرا): پیش‌فرض ثانویه «درخواست تماس»
   با href به فرم درخواست تماس ‎/contact است، نه «تماس با ما»؛ نیتش («ما به شما
   زنگ می‌زنیم») با اولیه («شما زنگ بزنید») فرق واقعی دارد (قانون ۳۷ design). */
export function Navbar({ logo, homeHref = "/", links, primary = { label: "تماس با مشاور سفر" }, secondary = { label: "درخواست تماس", href: "/contact#callback" }, sticky = true, callHref, className }: NavbarProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <header className={cn("z-40 border-b border-border bg-background/80 backdrop-blur", sticky && "sticky top-0", className)}>
        <nav aria-label="اصلی" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <a href={homeHref} className="flex items-center gap-2 text-base font-bold">{logo}</a>
          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} aria-current={l.active ? "page" : undefined} className={cn("rounded-md px-3 py-2 text-sm transition-colors duration-(--motion) hover:bg-accent focus-visible:bg-accent", l.active ? "text-foreground" : "text-muted-foreground")}>{l.label}</a>
              </li>
            ))}
          </ul>
          {/* D-031: ممیزی ۱۷:۴۶ - روی دسکتاپ دکمهٔ روح «تماس با مشاور سفر» (secondary) حذف شد؛
              همان لیبل با دو استایل متفاوت، کنار «تماس» ناوبری، سه محرک تکراری می‌ساخت.
              فقط دکمهٔ اصلی می‌ماند؛ secondary در شیت موبایل سر جایش است.
              D-109 (۱۴۰۵/۰۷/۲۱): استایل دکمهٔ اصلی هم به brand یکدست شد؛
              هر پنج «تماس با مشاور سفر» سایت (هدر، هیرو، صفحهٔ تور، کارت تماس، نوار چسبان)
              حالا کهربایی solid است؛ primary مسیر فروش = variant="brand" (الگوی blocks/hero رجیستری). */}
          <div className="hidden items-center gap-2 md:flex">
            {primary.href ? (
              <Button asChild size="sm" variant="brand"><a href={primary.href}>{primary.label}</a></Button>
            ) : (
              <Button size="sm" variant="brand">{primary.label}</Button>
            )}
          </div>
          <div className="flex items-center gap-1 md:hidden">
            {callHref && (
              <Button asChild variant="ghost" size="icon" className="size-11" aria-label="تماس با مشاور سفر" title="تماس با مشاور سفر">
                <a href={callHref}><Phone aria-hidden /></a>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-11" aria-label="باز کردن منو" title="باز کردن منو" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Menu aria-hidden /></Button>
          </div>
        </nav>
      </header>
      {/* A sibling of the header: backdrop-blur would otherwise trap the fixed sheet inside it. */}
      <Sheet open={open} onOpenChange={setOpen} title={logo}>
        <ul className="flex flex-col p-2">
          {links.map((l) => (
            <li key={l.label}><a href={l.href} aria-current={l.active ? "page" : undefined} className={cn("block rounded-md px-3 py-3 text-sm hover:bg-accent focus-visible:bg-accent", l.active ? "text-foreground font-semibold" : "text-muted-foreground")} onClick={() => setOpen(false)}>{l.label}</a></li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
          {primary.href ? (
            <Button asChild variant="brand" className="w-full"><a href={primary.href} onClick={() => setOpen(false)}>{primary.label}</a></Button>
          ) : (
            <Button variant="brand">{primary.label}</Button>
          )}
          {secondary.href ? (
            <Button asChild variant="outline" className="w-full"><a href={secondary.href} onClick={() => setOpen(false)}>{secondary.label}</a></Button>
          ) : (
            <Button variant="outline">{secondary.label}</Button>
          )}
        </div>
      </Sheet>
    </>
  );
}