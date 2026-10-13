import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarGroup } from "@/components/ui/avatar";

export interface HeroBlockProps {
  badge?: string;
  title: React.ReactNode;
  description: string;
  primary?: { label: string; href?: string };
  secondary?: { label: string; href?: string };
  /** Small social proof under the buttons. */
  proof?: { people: { name: string }[]; text: string };
}

/**
 * هیرو. Centered headline block with two actions and optional social proof,
 * followed by a temporary destination photo (موقت) as a calm frame
 * (quiet-luxury brief, 19 Mehr 1405; photo: Phang Nga Bay sunset, WebP).
 * ثبت منشأ: public/images/hero-phuket-sunset.webp ← موقت (تا سند عکس واقعی از مدیر برسد).
 *
 * The photo is dark and the theme is light, so it sits below the text as a
 * framed panel (restaurant-site registry precedent) instead of full-bleed:
 * the copy keeps full contrast on theme tokens, no invented scrim needed.
 */
export function HeroBlock({ badge, title, description, primary = { label: "تماس با مشاور سفر" }, secondary = { label: "مشاهدهٔ جزئیات تور" }, proof }: HeroBlockProps) {
  return (
    <section className="relative overflow-hidden px-6 pt-14 text-center sm:pt-20">
      <div className="relative mx-auto max-w-3xl">
        {badge && <Badge variant="brand">{badge}</Badge>}
        <h1 className="mt-5 text-balance text-4xl sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground sm:text-lg">{description}</p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          {primary.href ? (
            <Button asChild size="lg" className="rounded-full px-6"><a href={primary.href}>{primary.label}<ArrowLeft /></a></Button>
          ) : (
            <Button size="lg" className="rounded-full px-6">{primary.label}<ArrowLeft /></Button>
          )}
          {secondary.href ? (
            <Button asChild size="lg" variant="outline" className="rounded-full px-6"><a href={secondary.href}>{secondary.label}</a></Button>
          ) : (
            <Button size="lg" variant="outline" className="rounded-full px-6">{secondary.label}</Button>
          )}
        </div>
        {proof && (
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <AvatarGroup people={proof.people} max={4} size="sm" />
            <span>{proof.text}</span>
          </div>
        )}
      </div>
      <div className="relative mx-auto mt-12 max-w-5xl pb-14 sm:pb-20">
        <div className="overflow-hidden rounded-surface border border-border">
          <Image
            src="/images/hero-phuket-sunset.webp"
            alt="غروب خورشید بر فراز خلیج فنگ‌نا در پوکت؛ یکی از مقصدهای تورهای تایلندگرد"
            width={2400}
            height={1600}
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="h-auto w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
