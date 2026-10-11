#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
استخراج محتوای سایت تایلندگرد از فایل‌های TypeScript و تولید seed JSON.

Extracts ThailandGard site content from the TypeScript sources and writes
a per-table seed JSON for the Supabase content migration.

مبدأ (فقط خوانده می‌شود، هیچ تغییری نمی‌کند):
  site/lib/tours.ts     -> tours, tour_days, tour_faqs
  site/lib/guides.ts    -> guides, guide_sections, guide_faqs
  site/lib/site.ts      -> site_settings (16 سطر)
  site/lib/related.ts   -> related_links (7 سطر)

خروجی:
  ../seed/content_seed.json

اصل وفاداری: متن فارسی بایت‌به‌بایت حفظ می‌شود (ZWNJ و نیم‌فاصله‌ها).
برای همین، تجزیهٔ TS را خود موتور node انجام می‌دهد (ارزیابی واقعی کد،
نه پارسر دست‌ساز)؛ پایتون فقط ردیف‌ها را می‌چیند و JSON می‌نویسد.

اجرا:
  python3 extract_content.py
"""

import json
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]          # ~/workspace/thailandgard
LIB = REPO / "site" / "lib"
SEED_OUT = Path(__file__).resolve().parents[1] / "seed" / "content_seed.json"

# شمار موردانتظار هر جدول (راستی‌آزمایی‌شده با grep روی فایل‌های مبدأ)
EXPECTED_COUNTS = {
    "tours": 4,
    "tour_days": 28,
    "tour_faqs": 9,
    "guides": 3,
    "guide_sections": 9,
    "guide_faqs": 15,
    "site_settings": 16,
    "related_links": 7,
}

# قالب هارنس جاوااسکریپت: TS را به JS تمیز تبدیل و با node ارزیابی می‌کند.
# فقط سینتکس تایپ‌اسکریپت حذف می‌شود؛ رشته‌ها دست نخورده می‌مانند.
HARNESS_JS = r"""
import { readFileSync } from 'fs';

function tsToJs(src) {
  // حذف بلوک‌های interface (بسته‌شدن با } در ابتدای خط)
  src = src.replace(/^export interface [\s\S]*?^}/gm, '');
  // حذف توابع کمکی exportشده (getTour/getGuide)؛ فقط داده لازم است
  src = src.replace(/^export function [\s\S]*?^}/gm, '');
  // حذف type annotation روی constهای exportشده: «export const X: T =» -> «export const X =»
  src = src.replace(/^export const ([A-Za-z_$][\w$]*)\s*:[^=]*=/gm, 'export const $1 =');
  // برداشتن کلمه export تا constها در اسکوپ Function قابل دسترسی باشند
  src = src.replace(/^export const /gm, 'const ');
  return src;
}

const out = {};
for (const [path, names] of JSON.parse(readFileSync(process.argv[2], 'utf8'))) {
  const js = tsToJs(readFileSync(path, 'utf8'));
  const fn = new Function(js + '\nreturn { ' + names.join(', ') + ' };');
  const got = fn();
  for (const n of names) {
    if (!(n in got)) throw new Error('missing const after transform: ' + n + ' in ' + path);
    out[n] = got[n];
  }
}
console.log(JSON.stringify(out));
"""


def parse_with_node() -> dict:
    """هر ۴ فایل TS را با node واقعی ارزیابی می‌کند و دیکشنری constها را برمی‌گرداند."""
    site_src = (LIB / "site.ts").read_text(encoding="utf-8")
    site_names = re.findall(r"^export const ([A-Za-z_$][\w$]*)", site_src, flags=re.M)
    expected_site = [
        "SITE_NAME", "SITE_LATIN", "SITE_SLOGAN", "SITE_TAGLINE",
        "CONTACT_NAME", "CONTACT_TITLE",
        "PHONE_MOBILE", "PHONE_MOBILE_DISPLAY", "PHONE_MOBILE_LINK", "WHATSAPP_LINK",
        "PHONE_LANDLINE", "PHONE_LANDLINE_DISPLAY", "PHONE_LANDLINE_LINK",
        "PHONE_CHANNELS_NOTE", "SITE_URL", "NAV_LINKS",
    ]
    if site_names != expected_site:
        raise SystemExit(
            "site.ts exports changed! expected %d names, got: %s" % (len(expected_site), site_names)
        )

    jobs = [
        [str(LIB / "tours.ts"), ["TOURS"]],
        [str(LIB / "guides.ts"), ["GUIDES"]],
        [str(LIB / "site.ts"), site_names],
        [str(LIB / "related.ts"), ["GUIDE_TO_TOURS", "TOUR_TO_GUIDES"]],
    ]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as jf:
        json.dump(jobs, jf)
        jobs_path = jf.name
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8") as hf:
        hf.write(HARNESS_JS)
        harness_path = hf.name

    try:
        proc = subprocess.run(
            ["node", harness_path, jobs_path],
            capture_output=True, text=True, encoding="utf-8", timeout=60,
        )
    finally:
        Path(jobs_path).unlink(missing_ok=True)
        Path(harness_path).unlink(missing_ok=True)

    if proc.returncode != 0:
        raise SystemExit("node harness failed:\n" + proc.stderr[-3000:])
    return json.loads(proc.stdout)


def build_seed(data: dict) -> dict:
    seed = {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "sources": [
                "site/lib/tours.ts",
                "site/lib/guides.ts",
                "site/lib/site.ts",
                "site/lib/related.ts",
            ],
            "note": "متن‌ها بایت‌به‌بایت از فایل مبدأ آمده‌اند (ZWNJ حفظ شده)؛ positionها همان ترتیب فایل‌اند.",
        },
        "tours": [],
        "tour_days": [],
        "tour_faqs": [],
        "guides": [],
        "guide_sections": [],
        "guide_faqs": [],
        "site_settings": [],
        "related_links": [],
    }

    for t in data["TOURS"]:
        seed["tours"].append({
            "slug": t["slug"],
            "title": t["title"],
            "short_title": t["shortTitle"],
            "days": t["days"],
            "nights": t["nights"],
            "route": t["route"],
            "price_from": t["priceFrom"],
            "tourist_type": t["touristType"],
            "active": t["active"],
            "summary": t["summary"],
            "description": t["description"],
            "highlights": t["highlights"],
            "includes": t["includes"],
            "excludes": t["excludes"],
        })
        for d in t["itinerary"]:
            seed["tour_days"].append({
                "tour_slug": t["slug"],
                "day": d["day"],
                "title": d["title"],
                "description": d["description"],
            })
        for i, f in enumerate(t["faqs"], start=1):
            seed["tour_faqs"].append({
                "tour_slug": t["slug"],
                "position": i,
                "question": f["question"],
                "answer": f["answer"],
            })

    for g in data["GUIDES"]:
        seed["guides"].append({
            "slug": g["slug"],
            "title": g["title"],
            "excerpt": g["excerpt"],
            "category": g["category"],
            "reading_minutes": g["readingMinutes"],
            "updated_fa": g["updatedFa"],
        })
        for i, s in enumerate(g["sections"], start=1):
            seed["guide_sections"].append({
                "guide_slug": g["slug"],
                "position": i,
                "heading": s["heading"],
                "paragraphs": s["paragraphs"],
            })
        for i, f in enumerate(g["faqs"], start=1):
            seed["guide_faqs"].append({
                "guide_slug": g["slug"],
                "position": i,
                "question": f["question"],
                "answer": f["answer"],
            })

    for key in [
        "SITE_NAME", "SITE_LATIN", "SITE_SLOGAN", "SITE_TAGLINE",
        "CONTACT_NAME", "CONTACT_TITLE",
        "PHONE_MOBILE", "PHONE_MOBILE_DISPLAY", "PHONE_MOBILE_LINK", "WHATSAPP_LINK",
        "PHONE_LANDLINE", "PHONE_LANDLINE_DISPLAY", "PHONE_LANDLINE_LINK",
        "PHONE_CHANNELS_NOTE", "SITE_URL", "NAV_LINKS",
    ]:
        seed["site_settings"].append({"key": key, "value": data[key]})

    for slug, block in data["GUIDE_TO_TOURS"].items():
        seed["related_links"].append({
            "source_kind": "guide",
            "source_slug": slug,
            "target_kind": "tour",
            "target_slugs": block["slugs"],
            "lead": block["lead"],
            "trail": block["trail"],
        })
    for slug, block in data["TOUR_TO_GUIDES"].items():
        seed["related_links"].append({
            "source_kind": "tour",
            "source_slug": slug,
            "target_kind": "guide",
            "target_slugs": block["slugs"],
            "lead": block["lead"],
            "trail": block["trail"],
        })

    return seed


def verify_fidelity(seed: dict, parsed: dict) -> None:
    """۱) شمار سطرها ۲) وفاداری ZWNJ: متن‌های seed باید دقیقاً همان
    رشته‌های تجزیه‌شده از مبدأ باشند (بدون گم‌شدن/تغییر در بازچینی پایتون)
    ۳) نبود U+2014 در خروجی."""
    ZWNJ = "\u200c"  # U+200C, نیم‌فاصله
    problems = []

    for table, expected in EXPECTED_COUNTS.items():
        actual = len(seed[table])
        status = "OK " if actual == expected else "FAIL"
        print(f"  [{status}] {table:15s} expected={expected} actual={actual}")
        if actual != expected:
            problems.append(f"{table}: expected {expected}, got {actual}")

    # وفاداری متن: شمار ZWNJ در ردیف‌های seed با دادهٔ تجزیه‌شده از مبدأ یکی باشد
    site_names = [r["key"] for r in seed["site_settings"]]
    fidelity_pairs = [
        ("tours.ts",
         json.dumps(parsed["TOURS"], ensure_ascii=False),
         json.dumps(seed["tours"] + seed["tour_days"] + seed["tour_faqs"], ensure_ascii=False)),
        ("guides.ts",
         json.dumps(parsed["GUIDES"], ensure_ascii=False),
         json.dumps(seed["guides"] + seed["guide_sections"] + seed["guide_faqs"], ensure_ascii=False)),
        ("site.ts",
         json.dumps({k: parsed[k] for k in site_names}, ensure_ascii=False),
         json.dumps(seed["site_settings"], ensure_ascii=False)),
        ("related.ts",
         json.dumps({"GUIDE_TO_TOURS": parsed["GUIDE_TO_TOURS"],
                     "TOUR_TO_GUIDES": parsed["TOUR_TO_GUIDES"]}, ensure_ascii=False),
         json.dumps(seed["related_links"], ensure_ascii=False)),
    ]
    for fname, src_blob, seed_blob in fidelity_pairs:
        a, b = src_blob.count(ZWNJ), seed_blob.count(ZWNJ)
        status = "OK " if a == b else "FAIL"
        print(f"  [{status}] ZWNJ {fname:12s} parsed={a} seed={b}")
        if a != b:
            problems.append(f"ZWNJ mismatch for {fname}: parsed {a} vs seed {b}")

    # ممنوعیت خط تیره بلند در خروجی
    blob = json.dumps(seed, ensure_ascii=False)
    if "\u2014" in blob:  # خط تیره بلند، مطلقاً ممنوع
        problems.append("EM DASH (U+2014) found in seed output")
        print("  [FAIL] EM DASH detected")
    else:
        print("  [OK ] no EM DASH (U+2014)")

    if problems:
        raise SystemExit("VERIFICATION FAILED:\n" + "\n".join(problems))


def main() -> None:
    print("parsing TS sources with node...")
    data = parse_with_node()
    print("building seed rows...")
    seed = build_seed(data)
    print("verifying...")
    verify_fidelity(seed, data)
    SEED_OUT.parent.mkdir(parents=True, exist_ok=True)
    SEED_OUT.write_text(
        json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("wrote", SEED_OUT)
    print("ALL CHECKS PASSED")


if __name__ == "__main__":
    main()
