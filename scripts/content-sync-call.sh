#!/usr/bin/env bash
# فراخوان روت داخلی درج/به‌روزرسانی محتوا (POST /api/internal/content-sync).
#
#   scripts/content-sync-call.sh <payload.json> [base-url] [--dry-run]
#
# base-url پیش‌فرض: https://thailandgard.vercel.app
# سکرت از ~/.config/thailandgard/internal-content-secret خوانده می‌شود
# (دسترسی ۶۰۰، بیرون ریپو). هیچ سکرتی در این اسکریپت یا آرگومان‌ها نیست.
#
# خروجی: JSON روت. dry-run فقط اعتبارسنجی می‌کند و چیزی نمی‌نویسد.

set -euo pipefail

PAYLOAD="${1:?فایل payload داده نشد}"
BASE_URL="${2:-https://thailandgard.vercel.app}"
SECRET_FILE="${INTERNAL_CONTENT_SECRET_FILE:-$HOME/.config/thailandgard/internal-content-secret}"

if [ ! -r "$SECRET_FILE" ]; then
  echo "خطا: فایل سکرت خوانا نیست: $SECRET_FILE" >&2
  exit 1
fi

BODY="$(cat "$PAYLOAD")"
if [ "${3:-}" = "--dry-run" ]; then
  BODY="$(python3 -c "import json,sys; d=json.load(open('$PAYLOAD')); d['dry_run']=True; print(json.dumps(d, ensure_ascii=False))")"
fi

curl -sS -X POST "$BASE_URL/api/internal/content-sync" \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: $(cat "$SECRET_FILE")" \
  --data "$BODY"
echo
