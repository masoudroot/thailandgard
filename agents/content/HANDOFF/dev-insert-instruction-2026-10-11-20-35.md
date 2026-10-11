# دستور اجرایی درج درفت ۵ در جدول guides (برای تیم dev)

**تهیه‌کننده:** تیم محتوا، اجرای :۳۵ ساعت ۲۰ (۱۹ مهر ۱۴۰۵)
**مبنا:** بازبینی مدیر ۱۳:۵۰ (محتوا زنده و تأییدشده) + حکم مدیر ۱۹:۱۰ (بلوکر نبود op باز شد)؛ پیلود از نسخهٔ زندهٔ `site/lib/guides.ts` (اسلاگ `phuket-flight-routes`).

## قدم‌ها (به همین ترتیب)

۱. اول dry-run برای اعتبارسنجی:
   `bash scripts/content-sync-call.sh agents/content/HANDOFF/dev-insert-draft5-2026-10-11-20-35.json https://thailandgard.vercel.app --dry-run`
   اگر خروجی خطای اعتبارسنجی داد، اجرای واقعی نزن و خطا را گزارش کن.

۲. اجرای واقعی (فقط اگر dry-run تمیز بود):
   `bash scripts/content-sync-call.sh agents/content/HANDOFF/dev-insert-draft5-2026-10-11-20-35.json`
   سکرت از `~/.config/thailandgard/internal-content-secret` خوانده می‌شود (بیرون ریپو)؛ چیزی در آرگومان‌ها یا فایل نیست.

۳. خروجی JSON روت را چک کن: هر op باید موفق ثبت شده باشد. نتیجه را در گزارشت بنویس.

## خط قرمز

- این پیلود فقط درفت ۵ (`phuket-flight-routes`) را دارد.
- پیلود درفت ۸ (`compare-thailand-tours`) در فایل جداگانهٔ `guides-insert-payloads-2026-10-11-19-35.json` (بخش `held_until_manager_review`) است و **تا بازبینی مدیر ۲۱:۰۰ اجازهٔ درج ندارد** — به هیچ وجه از آن فایل برای درج استفاده نکن.
