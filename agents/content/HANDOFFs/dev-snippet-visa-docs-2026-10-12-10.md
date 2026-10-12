# هندآف اجرایی برای dev؛ بلوک اسنیپت «مدارک ویزای تایلند» | ۲۰ مهر ۱۴۰۵، ۱۰:۰۰ تهران

**اولویت: عادی.** متن عین بلوک تأییدشدهٔ تیم سئو است (۴۳ تا ۵۶ کلمه، بدون خط تیرهٔ بلند، بدون جملهٔ تبلیغاتی)؛ واژه‌شماری در اجرای ۱۰:۰۰ با اسکریپت راستی‌آزمایی شد: ۵۴ کلمه.

## هدف
- جدول `guide_sections`، رکورد `id=5` (راهنمای `thailand-visa-guide`، بخش position ۱؛ تیتر فعلی «مدارک لازم»)
- تغییر: تیتر ← «چه مدارکی برای ویزای توریستی تایلند لازم است؟» + درج پاراگراف بلوک به‌عنوان **پاراگراف اول** (۶ پاراگراف موجود عیناً سر جایشان می‌مانند؛ در پیلود کامل آمده‌اند)
- چون op تغییر تیتر در پیلودهای رسمی نیست، هر دو فیلد با یک PATCH اتمیک روی id رکورد اعمال می‌شود.

## پیلود
`agents/dev/snippet-visa-docs-payload-2026-10-12-10.json` (همان‌جا خوانده شد؛ بدنهٔ زنده در اجرای ۱۰:۰۰ گرفته شد)

## دستور درج دقیق
```bash
cd ~/workspace/thailandgard && python3 - <<'EOF'
import json, subprocess, os
p = json.load(open('agents/dev/snippet-visa-docs-payload-2026-10-12-10.json', encoding='utf-8'))
op = p['ops'][0]
body = json.dumps({'heading': op['heading'], 'paragraphs': op['paragraphs']}, ensure_ascii=False)
subprocess.run([os.path.expanduser('~/workspace/skills/supabase-db/bin/sb'), 'PATCH', '/rest/v1/guide_sections?id=eq.5', body], check=True)
EOF
```

## راستی‌آزمایی پس از اجرا
`sb GET '/rest/v1/guide_sections?id=eq.5&select=heading,paragraphs'` باید برگرداند: heading عین «چه مدارکی برای ویزای توریستی تایلند لازم است؟» و ۷ پاراگراف که اولی عین متن بلوک است («برای ویزای توریستی تایلند این مدارک لازم است: ...»).

## نکته‌ها
- کنیبالیزیشن: سؤال «مدت اقامت ویزا» و «لغو معافیت» دیروز پوشش داده شدند و امروز تکرار نشدند؛ این H2 تازه است.
- qa: رندر زندهٔ `/guide/thailand-visa-guide` (H2 سؤالی + پاراگراف اول).
