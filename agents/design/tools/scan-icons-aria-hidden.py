#!/usr/bin/env python3
"""گارد D-289: اسکن چندخطی‌محور آیکون‌های لوسیـد بدون aria-hidden.

پس‌زمینه: اسکن D-283 تک‌خطی بود و آیکون‌هایی که پراپ‌هایشان روی خط بعد
بود را جا انداخت (D-287 آن‌ها را تکمیل کرد). این اسکریپت تگ باز JSX را
ـ هرچند خط ـ تا بسته‌شدنش دنبال می‌کند و بعد aria-hidden را چک می‌کند.

استفاده:  python3 scan-icons-aria-hidden.py   (از ریشهٔ ریپو)
خروجی:    یافته‌های نیازمند تریاژ + استثناهای مستند شناخته‌شده.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SITE = REPO / "site"

# استثناهای مستند (دلیل‌دار؛ یافته نیستند)
KNOWN_EXCEPTIONS = {
    # (پسوند مسیر، نام آیکون): دلیل
    ("MobileOctoberBar.tsx", None): "نگهبانی کمپین اکتبر تا ۱۸ اکتبر (D-286/D-068)",
    ("OctoberBanner.tsx", None): "نگهبانی کمپین اکتبر تا ۱۸ اکتبر (D-286/D-068)",
    ("app/phuket-october/page.tsx", None): "نگهبانی صفحه کمپین پوکت تا ۱۸ اکتبر (D-068)؛ پس از آن بازبینی شود",
}

IMPORT_RE = re.compile(
    r"""import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]""", re.MULTILINE
)

EXCLUDE_DIRS = {"node_modules", ".next", "dist"}


def iter_tsx():
    for p in SITE.rglob("*.tsx"):
        if any(d in p.parts for d in EXCLUDE_DIRS):
            continue
        if "components/ui/" in p.as_posix():  # رجیستری وایب‌فارسی؛ دست نمی‌خورد
            continue
        yield p


def icon_names(src: str) -> set[str]:
    names: set[str] = set()
    for m in IMPORT_RE.finditer(src):
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            # `X as Y` → نام مصرفی Y است
            alias = re.split(r"\s+as\s+", part)
            names.add(alias[-1].strip())
    return names


def capture_open_tag(src: str, start: int) -> str | None:
    """از اندیس `<` تگ باز را تا بسته‌شدن (‎/>‎ یا ‎>‎ در عمق صفر آکولاد) برمی‌دارد."""
    depth = 0
    instr: str | None = None
    i = start
    n = len(src)
    while i < n:
        ch = src[i]
        if instr:
            if ch == "\\":
                i += 2
                continue
            if ch == instr:
                instr = None
        elif ch in "\"'":
            instr = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth = max(0, depth - 1)
        elif ch == ">" and depth == 0:
            return src[start : i + 1]
        i += 1
    return None


def scan_file(path: Path):
    src = path.read_text(encoding="utf-8")
    names = icon_names(src)
    findings = []
    for name in sorted(names):
        for m in re.finditer(r"<" + re.escape(name) + r"(?![\w])", src):
            tag = capture_open_tag(src, m.start())
            if tag is None:
                continue
            if "aria-hidden" in tag:
                continue
            line = src.count("\n", 0, m.start()) + 1
            first = tag.split("\n")[0].strip()[:80]
            findings.append((line, name, first))
    return findings


def main() -> int:
    fresh: list[tuple[str, int, str, str]] = []
    known: list[tuple[str, int, str, str]] = []
    for path in sorted(iter_tsx()):
        rel = path.relative_to(REPO).as_posix()
        for line, name, first in scan_file(path):
            exc_reason = None
            for (suffix, iname), reason in KNOWN_EXCEPTIONS.items():
                if rel.endswith(suffix) and (iname is None or iname == name):
                    exc_reason = reason
                    break
            entry = (rel, line, name, first)
            (known if exc_reason else fresh).append(entry + ((exc_reason,) if exc_reason else ()))

    print(f"== یافته‌های تازه (بدون aria-hidden): {len(fresh)}")
    for rel, line, name, first in fresh:
        print(f"  {rel}:{line}  <{name}>  {first}")
    print(f"== استثناهای مستند شناخته‌شده: {len(known)}")
    for rel, line, name, first, reason in known:
        print(f"  {rel}:{line}  <{name}>  ({reason})")
    return 0 if not fresh else 1


if __name__ == "__main__":
    sys.exit(main())
