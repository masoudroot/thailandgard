"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShareButtonsProps {
  /** متن اشتراک؛ همان og:title صفحه */
  title: string;
  /** مسیر کانونیکال صفحه، مثل /tours/phuket-7-days */
  path: string;
  /** آدرس پایهٔ سایت؛ از تنظیمات سایت (دیتابیس) می‌آید */
  siteUrl: string;
  /** وسط‌چین (هدر پیلار) */
  centered?: boolean;
  /** جداکنندهٔ مویی بالای ردیف (فقط صفحهٔ تور) */
  divider?: boolean;
  className?: string;
}

/**
 * دکمه‌های اشتراک‌گذاری صفحه.
 * اگر navigator.share موجود بود، یک دکمهٔ outline شیت بومی سیستم را باز می‌کند؛
 * وگرنه ردیف آیکونی کم‌رنگ تلگرام، واتس‌اپ و کپی لینک با بازخورد محلی «لینک کپی شد».
 * بدون وابستگی تازه؛ فقط واریانت‌های موجود دکمهٔ رجیستری (ghost/icon و outline/sm).
 * مبنا: agents/farsiui/COMPARE/share-final-check-2026-10-11-0535.md
 */
export function ShareButtons({ title, path, siteUrl, centered, divider, className }: ShareButtonsProps) {
  const [nativeShare, setNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const url = `${siteUrl}${path}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      /* کاربر شیت را بست؛ کاری لازم نیست */
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2",
        centered && "justify-center",
        divider && "mt-10 border-t border-border pt-6",
        className,
      )}
    >
      {nativeShare ? (
        <Button variant="outline" size="sm" onClick={handleNativeShare}>
          <Share2 aria-hidden />
          اشتراک‌گذاری
        </Button>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">اشتراک‌گذاری:</span>
          <div className="flex flex-wrap items-center gap-2">
            {/* D-026: دکمه‌ها برچسب متنی گرفتند (آیکون تنها نامفهوم بود) */}
            {/* M2 (ممیزی موبایل ۱۷ مهر): تارگت لمسی حداقل ۴۴ پیکسل */}
            <Button variant="ghost" size="sm" className="min-h-11" asChild>
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="اشتراک‌گذاری در تلگرام"
              >
                <Send aria-hidden />
                تلگرام
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="min-h-11" asChild>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="اشتراک‌گذاری در واتس‌اپ"
              >
                <MessageCircle aria-hidden />
                واتس‌اپ
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="min-h-11" aria-label="کپی لینک" onClick={handleCopy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              کپی لینک
            </Button>
          </div>
          <span aria-live="polite" className="text-sm text-muted-foreground">
            {copied ? "لینک کپی شد" : ""}
          </span>
        </>
      )}
    </div>
  );
}
