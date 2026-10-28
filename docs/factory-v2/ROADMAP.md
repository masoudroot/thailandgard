# نقشه اجرای کارخانه خودمختار تایلندگرد — نسخه ۲

**وضعیت:** در حال اجرا؛ P0 تکمیل شد؛ P1 (runtime گیت‌هاب اکشنز) پیاده و ادغام شده؛ P2 در CI سبز.
**تاریخ:** ۲۰۲۶-۱۰-۲۰ (به‌روزرسانی وضعیت: ۲۰۲۶-۱۰-۲۵)
**سند مرجع:** `docs/factory-v2/ARCHITECTURE.md`
**هدف:** تبدیل معماری تأییدشده به بسته‌های کاری قابل‌اجرا، با وابستگی روشن و Gate خروج.

---

## ۱. خلاصه

| مورد | مقدار |
|---|---|
| مدت تقریبی | ۹ تا ۱۳ هفته |
| مسیر بحرانی | P0 → P1 → P2 → P6 → P7 |
| اولین خروجی قابل‌نمایش | Walking Skeleton در پایان P2 |
| اولین انتشار واقعی | پس از Gate فاز P6 |
| واحد تحویل | Work Package، نه «فاز کلی» |
| مالک برنامه | Leader / Platform |
| تغییر production | فقط پس از Cutover Gate |

> Gateهای هر فاز مهم‌تر از تاریخ‌اند. اگر Gate رد شود، فاز بعد شروع نمی‌شود؛ فقط کارهای موازی غیروابسته ادامه می‌یابند.

---

## ۲. Workstreamها

| کد | Workstream | مسئول | خروجی |
|---|---|---|---|
| GOV | Governance و تصمیم | Leader | Policy، تصمیم، بودجه، ریسک |
| PLT | Platform | Dev/Platform | runtime، API، data |
| DOM | Domain Runtime | هر شش دامنه | Playbook، رادار، Task contract |
| QLT | Quality و Release | Quality + Dev | Gate، evidence، release، rollback |
| DAT | Data و Dashboard | Platform | Projection، داشبورد، observability |
| MIG | Migration و SRE | SRE | baseline، cutover، decommission |

---

## ۳. WBS — بسته‌های کاری

### فاز ۰ — تثبیت و Baseline

| ID | بستهٔ کاری | مسئول | وابستگی | خروجی | Gate خروج |
|---|---|---|---|---|---|
| P0-01 | Backup کامل Git/DB و tag production | SRE | — | tag، dump، checksum | restore تست‌شده |
| P0-02 | Baseline SEO/content/analytics | SEO + Content | P0-01 | URL inventory، sitemap، canonical، GSC snapshot | baseline تأییدشده |
| P0-03 | Triage و آرشیو وضعیت قدیمی | Leader + Platform | P0-01 | صف/پچ/چرخهٔ آرشیوشده | هیچ merge خودکار |
| P0-04 | Inventory secretها و دسترسی‌ها | Dev | P0-01 | لیست token، scope، مالک | token پهن‌دامنه شناسایی‌شده |
| P0-05 | Freeze تغییرات پرریسک | Leader | P0-02 | پنجرهٔ freeze و استثناها | تأیید Leader |
| P0-06 | Runbook رفع اضطراری | SRE | P0-01 | runbook کوتاه | تمرین dry-run |

**خروج فاز:** production سالم، baseline کامل، هیچ کار قدیمی در صف فعال نیست.

### فاز ۱ — زیرساخت

| ID | بستهٔ کاری | مسئول | وابستگی | خروجی | Gate خروج |
|---|---|---|---|---|---|
| P1-01 | runtime گیت‌هاب اکشنز + runner درون‌فرآیندی | Platform | P0 | اجرای موفق job آزمایشی | WorkItem آزمایشی |
| P1-02 | Postgres عملیاتی + migration core | Platform | P0 | schema، backup، retention | migration up/down |
| P1-03 | Object Storage + Secret Manager | Platform | P0 | bucket، policy، secretها | access test |
| P1-04 | اجرای runner در CI + زمان‌بندی jobها | Dev/Platform | P1-01 | jobs سبز، health | اجرای آزمایشی در staging |
| P1-05 | Control API skeleton | Platform | P1-01, P1-02 | start/status/health | auth test |
| P1-06 | Event Log + Outbox + Projector | Platform | P1-02 | event schema، projection | rebuild test |
| P1-07 | OTEL + health/readiness | Platform | P1-04 | trace، metric، alert | trace end-to-end |
| P1-08 | Local dev + CI | Dev | P1-01..P1-07 | compose، test، lint، build | CI سبز |
| P1-09 | دسترسی حداقلی: GITHUB_TOKEN در Actions + مسیر انتشار Git-native ورسل (ADR-012) | Dev | P0-04 | توکن کوتاه‌عمر؛ بدون secret ذخیره‌شده | branch/preview test ✓ (P1-COMPLETION) |

**خروج فاز:** یک WorkItem ساختگی از API تا projection اجرا شود؛ هیچ نوشتن production ندارد.

### فاز ۲ — Walking Skeleton (Content R0)

| ID | بستهٔ کاری | مسئول | وابستگی | خروجی | Gate خروج |
|---|---|---|---|---|---|
| P2-01 | قراردادهای دامنه + JSON Schema | Platform + Content | P1-05 | contracts، validation | contract test |
| P2-02 | Content R0 (runner درون‌فرآیندی) | Content | P2-01 | draft/edit/fact-check | ۳ خروجی معتبر |
| P2-03 | Gate Engine (content/SEO) | Quality | P2-01 | gate runner، evidence | evidence امضاشده |
| P2-04 | Policy Engine v1 | Governance | P2-03 | R0/R1 rules | policy test |
| P2-05 | Release + Merge Queue + preview | Dev | P1-09, P2-03 | preview، merge، deploy | rollback test |
| P2-06 | Walking Skeleton E2E | Platform | P2-02..P2-05 | WorkItem کامل روی صفحهٔ کم‌ریسک | ۳ WorkItem موفق |
| P2-07 | Outcome v0 | Platform + SEO | P2-06 | ثبت baseline/outcome | outcome record |

**خروج فاز:** Content R0 از Signal تا production و outcome، با evidence کامل و بدون نوشتن مستقیم.

### فاز ۳ — SEO + Tour Facts

| ID | بستهٔ کاری | مسئول | وابستگی | خروجی | Gate خروج |
|---|---|---|---|---|---|
| P3-01 | SEO Radar (ساعتی/روزانه) | SEO | P1-01 | news/SERP/GSC ingest | signal dedupe |
| P3-02 | Tour Fact Contract | Tour Manager | P2-01 | fact sheet، price/availability | accuracy test |
| P3-03 | SEO Gateهای R1 | SEO + Quality | P2-03 | metadata/schema/link/crawl | ۱۰ صفحه pass |
| P3-04 | DomainOps SEO | SEO | P3-01 | strategy/playbook loop | ۱ چرخهٔ کامل |
| P3-05 | DomainOps Tour | Tour Manager | P3-02 | offer calendar/fact update | ۱ چرخهٔ کامل |
| P3-06 | Backlink/Outreach pipeline | SEO | P3-01 | prospect، sequence، measure | policy-compliant |

**خروج فاز:** R1 خودکار با evidence؛ Tour data به‌عنوان منبع معتبر در DAG.

**Execution record:** P3 locally implemented and verified; live credentials are documented in `docs/factory-v2/P3-CREDENTIALS.md`. See `docs/superpowers/plans/2026-10-21-factory-v2-p3.md`.

### فاز ۴ — Design + Dev

| ID | بستهٔ کاری | مسئول | وابستگی | خروجی | Gate خروج |
|---|---|---|---|---|---|
| P4-01 | Design system و visual baseline | Design | P2-05 | token، component spec، baseline | visual diff |
| P4-02 | Design Gateها | Design + Quality | P4-01 | responsive/a11y/visual | axe + screenshot |
| P4-03 | Dev sandbox کامل | Dev | P1-04 | build/test/e2e/scan | isolated run |
| P4-04 | R2 Policy و feature flag | Governance + Dev | P2-04 | rules، flag، rollout | یک R2 با rollback |
| P4-05 | DomainOps Design | Design | P4-02 | UX research/experiment loop | ۱ آزمایش |
| P4-06 | DomainOps Dev | Dev | P4-03 | security/perf/tech-debt loop | ۱ چرخه |

**خروج فاز:** یک تغییر R2 با preview، flag، rollout و rollback موفق.

### فاز ۵ — Leader + Domain Ops

| ID | بستهٔ کاری | مسئول | وابستگی | خروجی | Gate خروج |
|---|---|---|---|---|---|
| P5-01 | PortfolioWorkflow | Leader | P3, P4 | OKR، priority، conflict | ۱ تصمیم پورتفوی |
| P5-02 | Budget/Quota Ledger | Platform + Leader | P1-02 | per-domain budget | enforcement test |
| P5-03 | Domain Scorecards | Platform | P2-07, P3, P4 | KPI dashboards | ۶ scorecard |
| P5-04 | Cross-domain arbitration | Leader | P5-01 | decision record | veto test |
| P5-05 | DomainOps Leader | Leader | P5-01 | daily/weekly review | ۱ هفته اجرا |

**خروج فاز:** حاکمیت پورتفوی، بودجه و KPI قابل ردیابی.

### فاز ۶ — Shadow و Cutover

| ID | بستهٔ کاری | مسئول | وابستگی | خروجی | Gate خروج |
|---|---|---|---|---|---|
| P6-01 | Shadow mode | Platform | P2..P5 | اجرای موازی بدون write | ۱۰ WorkItem مقایسه |
| P6-02 | Cutover gate review | Leader + SRE | P6-01 | checklist امضاشده | همهٔ Gateها pass |
| P6-03 | Production cutover | SRE | P6-02 | `FACTORY_RUNTIME=new` | چند Release سالم |
| P6-04 | Rollback drill | SRE | P6-03 | بازگشت به old | RTO مشخص |
| P6-05 | SEO regression check | SEO | P6-03 | crawl/GSC diff | بدون regression |

**خروج فاز:** مسیر جدید production، مسیر قدیمی read-only، rollback تست‌شده.

### فاز ۷ — Decommission و تثبیت

| ID | بستهٔ کاری | مسئول | وابستگی | خروجی | Gate خروج |
|---|---|---|---|---|---|
| P7-01 | حذف worker/queue قدیمی | Platform | P6-04 | خاموشی کامل | هیچ consumer قدیمی |
| P7-02 | ابطال tokenها و secretهای قدیمی | Dev | P7-01 | rotation | access review |
| P7-03 | آرشیو داده و اسناد | SRE | P7-01 | archive، retention | restore test |
| P7-04 | SLO و incident drill | SRE | P6-03 | SLO، alert، runbook | drill موفق |
| P7-05 | Cost tuning | Platform + Leader | P6-03 | cost per outcome | بودجه پایدار |
| P7-06 | Retrospective | Leader | P7-05 | درس‌ها، Playbook update | تصمیم اصلاحی |

---

## ۴. وابستگی‌ها

```text
P0 ──► P1 ──► P2 ──► P6 ──► P7
               │
               ├──► P3 ──┐
               ├──► P4 ──┼──► P5 ──► P6
               └─────────┘
```

- P3، P4 و P5 بعد از P2 موازی‌اند؛ اما P5 به خروجی P3/P4 وابسته است.
- P6 بدون Gateهای P2/P3/P4/P5 شروع نمی‌شود.
- P7 فقط پس از rollback drill و تأیید SRE.

---

## ۵. RACI

| فعالیت | Leader | Domain Owners | Platform | Quality | SRE |
|---|---|---|---|---|---|
| اولویت و بودجه | A/R | C | I | I | I |
| Playbook دامنه | A | R | I | C | I |
| WorkItem DAG | A | R | C | C | I |
| Quality Gate | I | C | C | R/A | I |
| Policy | A | C | C | R | I |
| Release | I | C | R | C | A |
| Cutover | A | C | R | C | R |
| Rollback | I | C | R | C | A |
| Outcome | A | R | C | I | I |

`R` = مسئول اجرا، `A` = تأییدکننده نهایی، `C` = مشورت، `I` = مطلع.

---

## ۶. Gateهای سراسری

### Definition of Ready برای هر WorkItem

- دامنه و مالک مشخص.
- ریسک اولیه و blast radius.
- معیار پذیرش و KPI.
- منبع داده/فکت تأییدشده.
- بودجه و deadline.
- Playbook و Policy version.

### Definition of Done برای هر WorkItem

- Taskها نهایی.
- Evidence Bundle کامل.
- Policy Decision ثبت.
- Release سالم.
- Outcome اولیه ثبت.
- Audit trail کامل.
- قفل/بودجهٔ معلق صفر.

### Cutover Gate

- ۱۰ WorkItem R0/R1 با صفر نوشتن مستقیم.
- ۱۰۰٪ Evidence و Policy.
- rollback واقعی زیر ۵ دقیقه.
- SEO baseline بدون regression.
- cost per WorkItem در بودجه.
- incident drill موفق.
- `FACTORY_RUNTIME` تست‌شده.

---

## ۷. ریسک‌ها

| ریسک | اثر | کاهش |
|---|---|---|
| SEO regression در مهاجرت | از دست رفتن ترافیک | baseline، crawl diff، freeze، ۲۸ روز پایش |
| ناسازگاری projection و رویدادها | داشبورد اشتباه | Event Log، rebuild test، no dual-write |
| هزینهٔ مدل/ابزار | بودجه | budget ledger، circuit breaker، eval |
| Gate flaky | توقف کارخانه | قرنطینه، retry policy، بازبینی threshold |
| وتوی تخصصی بیش‌ازحد | کندی | evidence اجباری، SLA، داوری Leader |
| Cold start runner | تأخیر | موازی‌سازی jobها، محدودیت concurrency اکشنز |
| نشت secret | خطر امنیتی | Secret Manager، token کوتاه‌عمر، scan |
| وابستگی به vendor | قفل‌شدن | Gateway انتزاعی، قرارداد خروج |
| دادهٔ تور نادرست | ضرر تجاری | Tour Manager veto، fact-check gate |
| حجم WorkItem | صف طولانی | quota، priority، batch فقط برای R0 |

---

## ۸. معیارهای موفقیت

- ۹۹٪ تغییرات R0/R1 بدون دخالت انسان و با evidence کامل.
- صفر انتشار مستقیم خارج از Merge Queue.
- rollback زیر ۵ دقیقه.
- هزینهٔ هر WorkItem در بودجهٔ تعیین‌شده.
- کاهش زمان از Signal تا Release.
- افزایش سهم تغییراتی که Outcome مثبت دارند.
- کاهش تعداد WorkItemهای بدون KPI.

---

## ۹. وضعیت فعلی و قدم بعدی

**به‌روزرسانی ۲۰۲۶-۱۰-۲۵:**

- **P0:** تکمیل شد. تگ و baseline سایتمپ و عکس GSC ۲۸ روزه ثبت شد؛ صف قدیمی ساماندهی شد (۲۵ PR بسته، ۱۰۷ شاخه آرشیو و حذف، ۸ ورک‌فلو خاموش)؛ دستور برگشت نهایی شد و تمرین dry-run گرفت. اسناد: `docs/factory-v2/P0-TRIAGE.md`، `docs/factory-v2/P0-BRANCH-ARCHIVE.csv`، `docs/factory-v2/P0-ROLLBACK-RUNBOOK.md`. توقف تولید (freeze) همچنان برقرار است تا سوییچ فاز ۶.
- **P1:** تکمیل شد (۲۰۲۶-۱۰-۲۵). زمان‌بندی خودکار فعال شد (`factory-daily` روزانه ۰۷:۰۰ تهران + `factory-preview-probe` ماهانه)؛ دسترسی‌ها کوتاه‌عمر و حداقلی شد (GITHUB_TOKEN در Actions؛ بدون توکن ذخیره‌شدهٔ Vercel — ADR-012)؛ سکرت‌های TEMPORAL_* حذف شد. سند: `docs/factory-v2/P1-COMPLETION.md`.
- **P2:** Walking Skeleton در CI به‌صورت end-to-end سبز است. انتشار واقعی (preview / merge queue) تا Cutover غیرفعال می‌ماند.
- **P3:** کد پیاده‌سازی شده است (رادار سئو، قرارداد تور، گیت‌های R1، pipeline outreach). **اولین اجرای واقعی انجام شد (۲۰۲۶-۱۰-۲۸):** قرارداد تور روی Supabase تولید با ۹/۹ بررسی سبز و گیت فنی R1 روی صفحهٔ تور با ۱۳/۱۳ بررسی سبز؛ جزئیات و مانع‌های باقی‌مانده در `docs/ops/p3-staging-status-2026-10-28.md`. مانده: رادار سئو (نیازمند دسترسی GSC)، DomainOps (نیازمند Postgres/Temporal)، outreach واقعی (نیازمند دامنهٔ ایمیل تأییدشده).
- **P4 / P5:** شروع نشده است. **P6 (Shadow/Cutover)** و **P7 (Decommission)** در انتظار Gateهای قبلی‌اند.
- **قدم بعدی:** تثبیت P3 در staging (اجرای واقعی چرخه‌ها بدون تغییر production)، سپس شروع P4/P5 و فعال‌سازی مسیر انتشار P2-05 با تأیید انسانی.
