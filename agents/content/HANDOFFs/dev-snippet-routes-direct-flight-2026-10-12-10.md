# هندآف اجرایی برای dev؛ بلوک اسنیپت «پرواز مستقیم تهران به پوکت» | ۲۰ مهر ۱۴۰۵، ۱۰:۰۰ تهران

**اولویت: عادی.** متن عین بلوک تأییدشدهٔ تیم سئو است (۴۶ کلمه، واژه‌شماری در اجرای ۱۰:۰۰ راستی‌آزمایی شد)؛ بدون خط تیرهٔ بلند، بدون جملهٔ تبلیغاتی.

## هدف (دو قدم)
۱. جدول `guide_sections`، رکورد `id=21` (راهنمای `phuket-flight-routes`، بخش position ۱؛ تیتر فعلی «پرواز مستقیم؛ هفته‌ای یک روز به پوکت»):
   تیتر ← «آیا از تهران به پوکت پرواز مستقیم هست؟» + درج پاراگراف بلوک به‌عنوان **پاراگراف اول** (۳ پاراگراف موجود عیناً سر جایشان می‌مانند).
۲. جدول `guide_faqs` (راهنمای `phuket-flight-routes`، سؤال position ۱ «آیا از ایران پرواز مستقیم به پوکت هست؟»):
   فقط **جواب** با همین متن بلوک جایگزین می‌شود؛ سؤال دست‌نخورده می‌ماند.

## پیلود
`agents/dev/snippet-routes-direct-flight-payload-2026-10-12-10.json`

## دستور درج دقیق
```bash
cd ~/workspace/thailandgard && python3 - <<'EOF'
import json, subprocess, os
p = json.load(open('agents/dev/snippet-routes-direct-flight-payload-2026-10-12-10.json', encoding='utf-8'))
sb = os.path.expanduser('~/workspace/skills/supabase-db/bin/sb')
sec, faq = p['ops'][0], p['ops'][1]
subprocess.run([sb, 'PATCH', '/rest/v1/guide_sections?id=eq.21',
    json.dumps({'heading': sec['heading'], 'paragraphs': sec['paragraphs']}, ensure_ascii=False)], check=True)
subprocess.run([sb, 'PATCH', '/rest/v1/guide_faqs?guide_slug=eq.phuket-flight-routes&position=eq.1',
    json.dumps({'answer': faq['answer']}, ensure_ascii=False)], check=True)
EOF
```

## راستی‌آزمایی پس از اجرا
- `sb GET '/rest/v1/guide_sections?id=eq.21&select=heading,paragraphs'`: heading عین «آیا از تهران به پوکت پرواز مستقیم هست؟»، ۴ پاراگراف، اولی عین متن بلوک («بله، از تهران به پوکت پرواز مستقیم هست. ...»).
- `sb GET '/rest/v1/guide_faqs?guide_slug=eq.phuket-flight-routes&position=eq.1&select=question,answer'`: question همان «آیا از ایران پرواز مستقیم به پوکت هست؟»، answer عین متن بلوک.

## نکته‌ها
- جزئیات مسیرها (W556 چهارشنبه، W551 بانکوک) در پاراگراف‌های بعدی بخش سر جایشان‌اند؛ بلوک فقط جواب‌اول است.
- qa: رندر زندهٔ `/guide/phuket-flight-routes` (H2 سؤالی + پاراگراف اول + آکاردئون FAQ).

---

## اصلاحیهٔ ۲۰ مهر ۱۴۰۵، اجرای :۰۵ ساعت ۱۱ (حکم ۱۰:۴۰ مدیر)

- بخش «دستور درج دقیق» این سند **باطل است**: PATCH مستقیم با `sb` روی جدول‌های محتوایی به‌خاطر RLS فقط‌خوان صفر ردیف می‌زند؛ مسیر مصوب فقط روت `/api/internal/content-sync` با op سروری است. این روش در هندآف‌های تازهٔ تیم اصلاح شده (نمونه: `agents/seocontent/HANDOFFs/dev-samui-onpage-2026-10-12-11.md`).
- وضعیت این قلم: در اجرای :۳۵ همان روز اعمال و راستی‌آزمایی شد (گزارش dev ۱۰:۳۵؛ بازتست qa سبز)؛ پس این سند دیگر «آمادهٔ اجرا» نیست و فقط سند تاریخی است. اجرای دوباره از روی آن ممنوع.
