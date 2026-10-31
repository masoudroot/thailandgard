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

## ۹.۱. فاز REBUILD-R2: یکپارچه‌سازی هستهٔ کارخانه (در حال اجرا)

**به‌روزرسانی ۲۰۲۶-۱۰-۳۰:** مبنا main واقعی با کامیت `06ecbf9` (پس از مرج R1) و شاخهٔ کاری `rebuild/factory-r2`. مبنای Verify همان Node 22 است؛ نسخهٔ 24.x روی Vercel فقط گزارش می‌شود و عوض نمی‌شود. R2 فقط شاخه و Preview و گزارش می‌سازد؛ مرج آن تأیید جداگانه می‌خواهد (همان الگوی R1).

**قرارداد واحد (تصمیم R2):** برای هر مسئولیت فقط یک ماشین وضعیت اجرا وجود دارد و آن مدل قدمِ اثبات‌شدهٔ MVP-01 است (قدم قابل claim با lease و fencing و attempt پایدار). اسکیمای WorkItem در main (دامنه، ریسک، بودجه، نسخهٔ policy) پاکت اعتبارسنجی است و از راه Adapter فقط‌خواندنی به نمای قدم‌ها وصل می‌شود، نه یک وضعیت موازی دوم. موتور DAG در main همچنان فقط مستند است و در R2 ساخته نمی‌شود؛ زنجیرهٔ قدم‌ها مرتب و با پیش‌نیاز است.

**جدول تصمیم هر جزء (برچسب‌های مأموریت R2):**

| جزء | تصمیم | شرح کوتاه |
|---|---|---|
| Work Item / Task / DAG | integrate_with_adapter | وضعیت اجرا با مدل MVP-01؛ اسکیمای main پاکت اعتبارسنجی با Adapter فقط‌خواندنی؛ DAG موکول به بعد |
| Work Step | reuse_mvp01 | مدل قدم + RPCهای claim و finish + قواعد گذار، بدون بازنویسی |
| Attempt و outcome_unknown | reuse_mvp01 | attempt پایدار؛ outcome_unknown هرگز کورکورانه retry نمی‌شود |
| Lease و Fencing | reuse_mvp01 | claim و finish با lease_owner و fencing_token |
| Publication و Publication Outbox | reuse_mvp01 | انتشار اتمیک با pointer و outbox و verification و rollback به‌صورت انتشار تازه؛ manifest خشک main فقط بستهٔ شواهد است، نه سازوکار انتشار |
| Event Log و Event Outbox | integrate_with_adapter | هر دو می‌مانند با نام و مسئولیت جدا؛ relay برای outbox رویداد موکول به بعد |
| Tick Runner | reuse_mvp01 | مسیر واحد `POST /api/factory/tick` با قدیمی‌ترین قدم آماده؛ runner درون‌فرآیندی main برای عملیات دامنه می‌ماند و در tick ادغام نمی‌شود |
| Factory Health | integrate_with_adapter | شکل health در main حفظ می‌شود و وضعیت واقعی کارخانه از staging (تنظیمات، قدم‌ها، outbox، آخرین run) به آن اضافه می‌شود؛ fail-closed |
| Budget و Cost Ledger | defer | اسکیما و RPCها برای سازگاری منتقل می‌شوند؛ اعمال سقف موکول به R3 است چون در R2 فراخوانی مدل وجود ندارد |
| Kill Switch | reuse_mvp01 | جدول factory_settings با ارزیابی fail-closed |
| Verification و Rollback | integrate_with_adapter | verification و rollback انتشار با مدل MVP-01؛ گیت‌های content و seo در main کیفیت artifact را می‌سنجند |

**حکم دو outbox:** Publication Outbox برای تغییرهای سایت و Event Outbox برای رویدادهای عملیاتی از هم جدا می‌مانند، با نام و مسئولیت روشن. در staging هر دو در همان دیتابیس staging هستند؛ هیچ رویداد یا انتشار آزمایشگاهی وارد production نمی‌شود. تبدیل انتشار تکمیل‌شده به رویداد عملیاتی فقط یک رکورد اعلانِ append-only است، نه نوشتن دوگانهٔ وضعیت.

**محدودهٔ R2:** فقط گردش‌کار `guide_content_v1` منتقل می‌شود؛ گردش‌کار shadow در آزمایشگاه می‌ماند و موکول به بعد است. ADR-008 دست‌نخورده می‌ماند: جای tick در staging روی دیتابیس سایت است فقط برای اثبات، و جای نهایی وضعیت tick در معماری تولید تصمیم cutover است، نه تصمیم R2. Model Gateway، Temporal و زیرساخت تازه خارج از محدوده‌اند.

**تفاوت‌های باقی‌ماندهٔ دو خط (پس از R2):** جای وضعیت tick در تولید (سایت یا ops)؛ موتور DAG؛ relay برای outbox رویداد؛ اعمال بودجه؛ ورود runnerهای عملیات دامنه به tick؛ نیمهٔ merge-queue در مسیر release در main.

### 9.2 مانیفست R2-A: Adapter واحد، Health کامل، بدون Migration تازه (۱۴۰۵/۰۸/۰۸)

- مبنا: شاخهٔ `rebuild/factory-r2` روی main واقعی با کامیت پایهٔ `06ecbf9`؛ کامیت R2 برابر `56281e9` است و دلتای R2-A روی همان شاخه می‌نشیند؛ بدون مرج، بدون Deploy پروداکشن.
- قرارداد Adapter (`site/lib/factory/tick/adapter.ts`، نسخهٔ `r2a-1`): فقط «اجازهٔ ورود» است، نه موتور. Work Item اصلی را می‌خواند؛ deferred (یعنی `source_shadow_v1`) بی‌صدا رد می‌شود؛ manual یا قدیمی (شامل NULL) هرگز Claim نمی‌شود؛ tick_managed با نسخهٔ ناشناخته، با وضعیت مشخص مسدود می‌شود؛ فقط tick_managed با `guide_content_v1` و Step شناخته‌شدهٔ همان Workflow، eligible است. envelope اصلی factory-v2، وقتی همراه Work Item باشد، با WorkItemSchema اعتبارسنجی می‌شود و envelope نامعتبر fail-closed رد می‌شود؛ نبودن envelope، رد نیست. DAG، فقط envelope و metadata می‌ماند و هیچ موتور DAG ساخته نمی‌شود.
- مسیر Tick، همان مسیر واحد `POST /api/factory/tick` است که گیت‌هایش از R2 به Adapter منتقل شد؛ رفتار، عین R2 است و ترتیب گیت‌ها (deferred، بعد وضعیت پایانی، بعد manual، بعد نسخهٔ ناشناخته، بعد Step) حفظ شده است. نسخهٔ Runner به `r2a-tick-1` رسید.
- Health کامل (`site/lib/factory/tick/health.ts`): فیلدهای R2 مانده‌اند و سه گروه اضافه شده است: کارهای در حال اجرا (اجتماع Stepهای claimed و Work Itemهای publishing)، خطاهای اخیر (پنج Attempt ناموفق اخیر با فقط کد خطا و وضعیت پایان، بدون متن خطا) و همهٔ Kill Switchها با مقدار خام‌شان. هیچ Secret و هیچ متن خطای دیتابیس در پاسخ نیست.
- Migrationهای R2-A: هیچ Migration تازه‌ای لازم نبود. مانیفست Migrationها، همان دو فایل R2 است: `20261030120000_factory_tick_tables.sql` (جدول‌های factory شامل publications و outbox انتشار، work_items و artifacts و approvals، steps و attempts و runs و settings و ledger و budgets، به‌علاوهٔ ستون‌های execution_mode و workflow_version) و `20261030120100_factory_tick_functions.sql` (هفت تابع نهایی publish_content_atomic و create_approved_version و claim_outbox_event و claim_work_step_by_id و finish_work_step و reserve_budget و release_budget). هر دو، اول روی Scratch تازه و بعد فقط روی Supabase Staging اجرا شدند و شمارش‌ها پیش و پس یکسان ماندند؛ Production هرگز لمس نشد. جدول‌های Event Outbox و Event Log اصلی، در staging ساخته نشده‌اند و Relay هم ساخته نشده است؛ جدایی، با همین «نساختن» حفظ شده است.
- دادهٔ تاریخی: هیچ Publication یا Outbox تاریخی آزمایشگاه، با R2-A به جایی منتقل نشده است؛ سطرهای staging، همان سطرهایی‌اند که خود آزمایشگاه در همان پروژهٔ staging ساخته بود و R2-A فقط کد را روی همان دیتابیس اثبات کرده است.

### 9.3 مانیفست R2A.1: قاعدهٔ Scope، تعیین تکلیف، چرخش توکن (۱۴۰۵/۰۸/۰۸)

- مبنا: شاخهٔ `rebuild/factory-r2` روی main واقعی؛ کامیت R2-A برابر `24b01b6` و کامیت کد R2A.1 برابر `cd6a0b7` است و دلتای R2A.1 روی همان شاخه می‌نشیند؛ بدون مرج، بدون Deploy پروداکشن، بدون فعال‌سازی خواندن نسخه‌دار در مسیر عمومی.
- قرارداد Adapter (`site/lib/factory/tick/adapter.ts`، نسخهٔ `r2a1-1`): حکم تازهٔ `out_of_scope` با رد بی‌صدا. هر Work Item ساخته‌شده پیش از برش `2026-10-30T15:44:00Z` (شروع مأموریت R2A.1، ۱۹:۱۴ تهران) خارج از Scope است؛ نبودن یا خراب بودن `created_at` هم fail-closed خارج از Scope است. ترتیب گیت‌ها: deferred، بعد out_of_scope، بعد وضعیت پایانی، بعد manual یا قدیمی، بعد نسخهٔ ناشناخته، بعد Step. بوت‌استرپ، فقط ساخته‌شده پس از برش را Step می‌دهد؛ اسکن نسخهٔ ناشناخته، کار تاریخی را به‌جای مسدود شدن فقط رد می‌کند. نسخهٔ Runner به `r2a1-tick-1` رسید.
- تعیین تکلیف staging (فقط staging، بدون حذف تاریخ): همهٔ ۳۱ Work Item ناتمام، با RPC فقط‌staging `quarantine_work_item` و جدول لاگ `factory_quarantine_log` به `cancelled` رفتند (cancelled، تنها وضعیت پایانی است؛ blocked به drafting برمی‌گردد)؛ ۴۱ Work Item موفق دست نخورد؛ Stepهای queued و claimed به blocked رفتند؛ رویدادهای outbox باز به failed رفتند با یک سطر Audit از نوع intervention برای هر رویداد؛ هیچ Publicationای Update یا Delete نشد. در آزمون‌های §۸، سه کار آزمایشی دیگر هم لغو شد (یکی از اجرای ناقص اسکریپت و دو کار آزمون) و شمار لغوشده‌ها به ۳۴ رسید. پس از تعیین تکلیف: Stepهای queued صفر، outbox باز صفر، و Tick، `no_work` با claimed صفر برمی‌گرداند. انتشار در انتظار آیتم سوم R2-A، در انتظار می‌ماند ولی دیگر قابل پردازش نیست.
- چرخش توکن داخلی staging: مقدار تازه در Secret گیت‌هاب، هر دو ورودی محیط پروژهٔ Preview و فایل سرور میرزا نشست؛ دیپلوی تازهٔ Preview با همان کد ساخته شد و سلامتی‌اش ۲۰۰ با صف صفر برگرداند؛ نسخهٔ پشتیبان قدیمی خرد شد. دیپلوی قبلی Preview با API لغو نمی‌شود (READY) و نشانی یکتای آن پشت ورود ورسل با محیط قدیمی می‌ماند؛ پاک کردنش با داشبورد ورسل است.
- خطای `fetch failed` (R2-A): با آزمون کنترل‌شده، دو فرضیه رد شد: پایین بودن تونل محلی staging روی سرور بی‌اثر است (Tick در همان حالت ۲۰۰ با `no_work` برگرداند، چون فراخوانی‌های PostgREST سرور از HTTPS می‌روند نه از تونل محلی) و میزبان Supabase خراب، خطای postgrest با ۴۰۱ می‌دهد نه `fetch failed` لخت. علت محتمل، اختلال گذرای سطح شبکه در نخستین فراخوانی دیتابیس است که شکل کد (بدون timeout، خطای undici، صفر تغییر وضعیت، runId تهی) با آن می‌خواند؛ محرک دقیق، بدون شاهد لاگ، unknown می‌ماند.
- آزمون‌ها: `npm run verify` با کد خروج ۰ (۴۵ فایل گذشت و ۴ skip و ۲۷۳ تست گذشت و ۸ skip)؛ بیلد با کد خروج ۰ (۱۹۲ صفحهٔ استاتیک). آزمون‌های زندهٔ §۸ روی ساخت میرزا با همان دیتابیس staging، ۲۰ از ۲۰ گذشت: کار تازهٔ پس از برش تا گیت تأیید انسانی جلو رفت؛ کار manual هرگز Step نگرفت؛ دو Tick هم‌زمان، هیچ Claim تکراری نساختند؛ تأیید معتبر و ساخت نسخه موفق بود؛ گیت publishing_disabled و گیت factory_paused هر دو با claimed صفر برگشتند؛ Tick پایانی `no_work` بود؛ هیچ انتشار تازه‌ای ساخته نشد؛ صفحهٔ عمومی، هر سه سرفصل راهنما و پاراگراف‌های اولشان را دارد و هیچ نشان آزمایشی به آن نشت نکرد. نکتهٔ رفتاری: Tick بوت‌استرپ، خودش `no_work` برمی‌گرداند و Claim، از Tick بعد شروع می‌شود؛ چون ساعت دیتابیس حدود ۱٫۴ ثانیه از ساعت سرور جلوتر است و scheduled_at تازه‌مهرخورده، در همان Tick «آینده» دیده می‌شود؛ بی‌ضرر و از پیش موجود است، نه ساختهٔ R2A.1.
- Migrationهای R2A.1: هیچ Migration محصول تازه‌ای لازم نبود و هیچ Migration محصولی کامیت نشد. RPC تعیین تکلیف، فقط روی staging اجرا شد و به‌عنوان Migration محصول در مخزن ننشست؛ خواندن نسخه‌دار، همچنان به R2-B موکول است.

### 9.4 مانیفست R3-A: قرارداد Model Gateway با Mock Provider، بدون فراخوان واقعی (۱۴۰۵/۰۸/۰۸)

- مبنا: شاخهٔ `rebuild/r3-model-gateway` از کامیت 510dae5 (R2A.1) منشعب شد؛ بدون مرج، بدون Deploy پروداکشن، بدون اتصال به Tick. Gateway در این بسته هیچ فراخواننده‌ای ندارد و وصل کردن آن بستهٔ بعدی است.
- قرارداد Gateway (`site/lib/factory/gateway/`، نسخهٔ `r3-gateway-1`): درخواست با work_item_id و work_step_id و attempt_id و capability و provider و model_id و prompt_version و input_schema و output_schema و token_limit و timeout و idempotency_key؛ پاسخ با usage و cost و خروجی ساخت‌یافته و وضعیت outcome (شامل outcome_unknown). خروجی ساخت‌یافته با Zod اعتبارسنجی می‌شود و خروجی نامعتبر، خطای اعتبارسنجی برمی‌گرداند و Attempt ناموفق ثبت می‌شود.
- Idempotency: فراخوان دوم با همان کلید، همان پاسخ را با نشانهٔ replayed برمی‌گرداند و Provider را دوباره صدا نمی‌زند و رزرو تازه نمی‌سازد. فقط نتیجه‌های پایانی فراخوان provider ذخیره می‌شوند؛ رد اعتبارسنجی و provider مسدود و رد بودجه ذخیره نمی‌شوند، چون عملیات انجام‌نشده است.
- بودجه در کد enforce می‌شود: پیش از فراخوان، رزرو با میدان‌های آینهٔ factory_cost_ledger و factory_daily_budgets چک می‌شود و اگر سقف رد شود، Provider اصلاً صدا زده نمی‌شود. رزرو محلی است و اتصال به RPCهای واقعی reserve_budget و release_budget، بستهٔ بعدی است. رزرو و هزینهٔ واقعی ثبت می‌شوند، حتی اگر صفر باشند؛ در unknown سطر commit نوشته نمی‌شود و cost برابر null است.
- timeout با AbortSignal اجرا می‌شود و یعنی outcome_unknown، نه failed. فراخوان دوباره با همان کلید، unknown ثبت‌شده را برمی‌گرداند و فراخوان تازه فقط با attempt_id تازه و کلید تازه ممکن است؛ Retry کورکورانه ممنوع است.
- Providerها: واسط ModelProvider و رجیستری ProviderRegistry؛ Mock Provider قطعی با حالت‌های ok و invalid و hang. Muse Spark در وضعیت blocked_missing_provider_access است: صفحهٔ رسمی Meta برای Model API می‌گوید این API در پیش‌نمایش عمومی است، ولی Credential آزمایشی در این بسته نیست و شرط چهارجزئی کامل نمی‌شود؛ هیچ Endpoint و Model ID و کلیدی ثبت نشده است و فراخوان واقعی‌اش رد می‌شود. هیچ فراخوان پولی واقعی در این بسته انجام نشد و هیچ محتوایی تولید یا منتشر نشد.
- نگهبان سمت سرور: بستهٔ `server-only` در package-lock نیست و افزودنش وابستگی تازه است؛ به‌جای import مستقیم، نگهبان زمان اجرا ورودی از مرورگر را می‌ایستاند و import صریح `server-only` به بستهٔ بعدی موکول شد.
- Migrationهای R3-A: هیچ Migration تازه‌ای لازم نبود و هیچ Migration محصولی کامیت نشد.
- آزمون‌ها: `npm run verify` با کد خروج ۰ (۴۶ فایل گذشت و ۴ skip و ۲۸۱ تست گذشت و ۸ skip؛ فایل تازهٔ r3-gateway-contract با ۸ تست)؛ بیلد با کد خروج ۰ (۱۹۲ صفحهٔ استاتیک). verify اول با حافظهٔ 3072 در typecheck با کد 137 کشته شد و تکرار آن با 4096 سبز شد؛ نصب اول هم با همان علت کشته شده بود و تکرارش سبز شد.

### 9.6 مانیفست R3-A دلتا: بودجهٔ enforceشده در کد و دیتابیس، تفکیک estimated_cost و actual_cost (۱۴۰۵/۰۸/۰۸)

- توجه شماره‌گذاری: §9.4 در حال حاضر سه بار مصرف شده است (R2-B و R3-A و DASH-01) و §9.5 سهم بستهٔ خواهر R2B.1 است؛ این مانیفست §9.6 است و در مرج، شماره‌ها باید یک‌بار بازشماری شوند.
- مبنا: همان شاخهٔ `rebuild/r3-model-gateway` روی کامیت a0d70be (قرارداد Path B)؛ این بسته فقط دلتا است، نه بازنویسی. بدون مرج، بدون Deploy پروداکشن، بدون اتصال به Tick، بدون فراخوان واقعی مدل.
- قرارداد (نسخهٔ `r3-gateway-2`): پاسخ به‌جای میدان `cost`، دو میدان `estimated_cost` (برآورد رزروشده از token_limit در estimateUnitPrice) و `actual_cost` (هزینهٔ واقعی از Provider؛ در unknown برابر null، نه صفر) دارد. AttemptRecord هم همین دو میدان را دارد، آینهٔ ستون‌های estimated_cost و actual_cost در factory_attempts. کد خطای تازهٔ `ledger_error` برای خرابی ترابری ledger است و fail-closed گزارش می‌شود.
- آداپتور ledger (`site/lib/factory/gateway/ledger.ts`) با واسط `BudgetLedger`: حالت محلی (دور InMemoryBudgetLedger دست‌نخورده، برای تست‌های واحد) و حالت PostgREST سمت سرور (reserve و release با RPCهای واقعی reserve_budget و release_budget، و commit با insert مستقیم PostgREST روی factory_cost_ledger، چون برای commit RPCای نیست). سربرگ‌ها آینهٔ الگوی internal-api.ts است و کلید service_role فقط سمت سرور می‌ماند. نکتهٔ attempt_id: شناسهٔ attempt در Gateway، شناسهٔ سطر factory_attempts نیست و work_step_id آن جدول تهی‌پذیر نیست؛ پس RPCها p_attempt_id تهی می‌گیرند (ستون تهی‌پذیر است) و سطرها با work_item_id قابل انتساب‌اند؛ وقتی اتصال Tick برسد، فراخواننده شناسهٔ attempt واقعی کارخانه را می‌دهد.
- اثبات Staging (با تست موقت vitest که پیش از کامیت حذف شد؛ Gateway واقعی با Mock Provider و آداپتور PostgREST): پیش از اثبات، ledger فقط ۱ سطر داشت (rejected با مبلغ ۱۰ از آزمون بودجهٔ M5) و تنظیم daily_budget_limit برابر ۰ بود و برای روز جاری سطری نبود؛ سقف روز موقتاً ۱۰۰۰۰۰۰ شد تا نخستین reserve، سطر روز را با آن سقف بسازد. آیتم آزمایشی manual با کلید r3a-delta-test-ledger-1 و سقف کار ۱۰۰۰۰: فراخوان معتبر با برآورد ۱۰۰ و واقعی ۳۰، سطرهای reservation با ۱۰۰ و release با ۷۰ و commit با ۳۰ ساخت و خرج کار را ۳۰ کرد؛ فراخوان با ۲۰۰۰۰ با کد budget_exceeded از سقف کار رد شد و سطر rejected با ۲۰۰۰۰ ساخت و Provider صدا زده نشد؛ آیتم دوم با سقف کار ۱۰۰۰۰۰۰۰ و فراخوان با ۲۰۰۰۰۰۰ با کد budget_exceeded از سقف روز رد شد و سطر rejected با ۲۰۰۰۰۰۰ ساخت؛ فراخوان hang با timeout به unknown رسید و سطرهای reservation با ۱۰۰ و release با ۱۰۰ ساخت و commit تازه‌ای نساخت و replay همان کلید، سطر تازه‌ای نساخت. پس از اثبات، هر دو آیتم با RPC قرنطینه به cancelled رفتند و تنظیم daily_budget_limit به ۰ و سقف سطر روز جاری به ۰ برگشت؛ وضعیت پایانی: ledger با ۱۰ سطر (reservation با ۳ سطر و مجموع ۳۰۰، release با ۳ سطر و مجموع ۲۷۰، commit با ۱ سطر و مبلغ ۳۰، rejected با ۳ سطر و مجموع ۲۰۲۰۰۱۰ شامل سطر قدیمی ۱۰) و سطر روز جاری با سقف ۰ و خرج ۳۰ که همان هزینهٔ واقعی اثبات است.
- فهرست میدان‌های قرارداد: از Path B آماده بود: work_item_id و work_step_id و attempt_id و capability و provider و model_id و prompt_version و input_schema و output_schema و token_limit و timeout و idempotency_key و budget reservation و usage و outcome_unknown و structured output validation. این بسته اضافه کرد: estimated_cost و actual_cost در پاسخ و AttemptRecord، واسط BudgetLedger با دو حالت، کد ledger_error، و اتصال RPC واقعی. برآورد، میدان درخواستی تازه نیست و از token_limit به دست می‌آید.
- نگهبان سمت سرور همچنان نگهبان زمان اجراست و import صریح `server-only` همچنان باز است (بسته در package-lock نیست و ADR و تأیید صریح می‌خواهد که این سفارش نداده است).
- Migrationهای R3-A دلتا: هیچ Migration تازه‌ای لازم نبود و هیچ Migration محصولی کامیت نشد. RPC قرنطینه فقط روی staging اجرا شد و Migration محصول نیست.
- آزمون‌ها: `npm run verify` با کد خروج ۰ (عددهای دقیق در گزارش)؛ فایل r3-gateway-contract با ۱۲ تست (۸ تست Path B به‌روز و ۴ تست تازه: تفکیک هزینه و تسویه، نگاشت PostgREST، خرابی آداپتور، fail-closed پیش از فراخوان)؛ بیلد با کد خروج ۰. گریپ سکرت روی فایل‌های تازه صفر است.

### 9.7 مانیفست R3A-SAFE: Fail-closed بودجه و مصالحهٔ نتیجهٔ نامعلوم، پیش از اتصال Gateway به Tick (۱۴۰۵/۰۸/۰۹)

- توجه شماره‌گذاری: §9.4 سه بار مصرف شده است (R2-B و R3-A و DASH-01) و §9.5 سهم بستهٔ خواهر R2B.1 و §9.6 سهم دلتای R3-A است؛ این مانیفست §9.7 است و در مرج، شماره‌ها باید یک‌بار بازشماری شوند.
- مبنا: شاخهٔ `rebuild/r3a-safe` از `rebuild/r3-model-gateway` روی کامیت e7cfd8e (قرارداد R3-A با دلتای بودجهٔ دیتابیسی). بدون مرج، بدون Deploy پروداکشن، بدون اتصال به Tick، بدون فراخوان واقعی مدل، بدون تغییر داشبورد قدیم و DASH-01.
- قرارداد (نسخهٔ `r3-gateway-3`، از `r3-gateway-2`): تغییر رفتاری آداپتور محلی از «سقف تنظیم‌نشده یعنی بدون سقف» به Fail-closed. واسط `BudgetLedger` عوض شد: `reserve` به‌جای boolean، `{ ok, reason }` برمی‌گرداند (`exceeded` یا `not_configured`) و `release` و `commit` مستقیم حذف شدند و جایشان `settle` و `findSettlement` و `findReservation` و `findOpenReconciliation` و `findReconciliation` و `openReconciliation` و `resolveReconciliation` آمد.
- سیاست سقف (یکسان در هر دو آداپتور، آینهٔ RPCهای موجود): سقف کار null (سطر کار نیست یا budget_limit تهی) یعنی درخواست هزینه‌دار پیش از هر فراخوان Provider با کد `budget_not_configured` رد می‌شود و هیچ سطر rejected هم نوشته نمی‌شود؛ حتی برآورد صفر هم رد می‌شود، چون RPC برای سقف کار null بی‌قیدوشرط false برمی‌گرداند. سقف روز null مثل صفر رفتار می‌کند (آینهٔ coalesce در RPC): برآورد مثبت با سطر rejected و کد `budget_exceeded` رد می‌شود و برآورد صفر مجاز است. سقف کار صفر هم همین‌طور: برآورد مثبت با سطر rejected رد می‌شود و برآورد صفر مجاز است. سقف کار و سقف روز همیشه هر دو اعمال می‌شوند. برای تمایز «تنظیم‌نشده» از «گذشته از سقف»، آداپتور PostgREST پیش از RPC، سقف کار را با یک کوئری می‌خواند؛ خود RPC همچنان نقطهٔ enforce است.
- سیاست مصالحه (بدون آزادسازی خودکار و بدون بازهٔ زمانی خودکار): در timeout یا نتیجهٔ نامعلوم، رزرو آزاد نمی‌شود و سطر مصالحه با وضعیت `pending_reconciliation` ساخته می‌شود و رزرو تا یکی از سه مسیر می‌ماند: آزادسازی فقط با شواهد عدم پردازش از Provider یا گواهی اپراتور (actor و دلیل و شواهد ثبت می‌شود)؛ تسویه فقط با شواهد مصرف (رسید یا usage قطعی)؛ ارجاع به انسان (`referred_to_human`) وقتی نه شواهد پردازش هست و نه شواهد عدم پردازش. تا مصالحهٔ یک attempt باز است، فراخوان تازه برای همان attempt با هر کلیدی با کد `reconciliation_pending` رد می‌شود و Provider صدا زده نمی‌شود و اثر تازه‌ای در Ledger نمی‌نشیند. فراخوان تازه فقط با attempt_id تازه ممکن است و unknown قبلی در مصالحه می‌ماند. Replay همان کلید، همان نتیجه را برمی‌گرداند و همان کلید با محتوای متفاوت با کد `idempotency_key_conflict` رد می‌شود.
- اتمیک بودن (دو سطح جدا گزارش می‌شود): اتمیک بودن تک‌فراخوان RPC برقرار است (reserve_budget و release_budget و settle_gateway_attempt تازه، هر کدام در یک تراکنش). اتمیک بودن زنجیرهٔ چندفراخوانی برقرار نیست: reserve و بعد settle دو فراخوان جداست و Crash میان آن دو، وضعیت «رزرو شده ولی تسویه‌نشده» می‌سازد که با ژورنال درون‌حافظه‌ای Gateway و سطر تسویهٔ یکتا قابل بازیابی است، ولی پس از راه‌اندازی تازهٔ پروسس، بدون factory_attempt_id قابل کشف نیست. تسویهٔ release+commit از مسیر RPC تازه در یک تراکنش می‌نشیند و فراخوان دوم با همان کلید، `already_settled` برمی‌گرداند و سطر تازه نمی‌سازد؛ release صفر یعنی سطر release نوشته نمی‌شود و commit تهی یعنی سطر commit نوشته نمی‌شود.
- هزینهٔ بالاتر از رزرو (سیاست محافظه‌کارانهٔ انتخاب‌شده): تسویه تا سقف رزرو انجام می‌شود و اضافه‌اش با دلیل `actual_exceeds_reservation` و نوع `excess` به مصالحه می‌رود. جذب بی‌صدا ممنوع است و پاسخ، `settled_cost` را جدا از `actual_cost` نشان می‌دهد.
- تمایز صریح هزینهٔ شبیه‌سازی‌شده از هزینهٔ واقعی (دستور مدیر پروژه): مبلغ ۳۰ در آزمون Mock دور پیش، برابر ۱۵ توکن × costPerToken برابر ۲، هزینهٔ شبیه‌سازی‌شده با واحد `mock-unit` است، نه هزینهٔ واقعی ارائه‌دهنده. هر مقدار هزینه، میدان `cost_basis` دارد: `simulated` برای Mock، `provider_actual` برای Provider واقعی (هنوز هیچ‌کدام نیست)، `estimated` وقتی هزینهٔ قطعی Provider نیست. واحد Mock هرگز شبیه واحد پول واقعی نیست و مبنای محاسبه از token_limit نوشته می‌شود. DASH-01 در این بسته دست نخورده است و `cost_basis` همان چیزی است که داشبوردهای بعدی از آن می‌خوانند.
- قرارداد attempt_id واقعی (طراحی‌شده، هنوز متصل نیست): میدان اختیاری `factory_attempt_id` (UUID) در قرارداد آمد و اعتبارسنجی حضور و شکل آن پیاده شد و آداپتور PostgREST آن را به‌جای null به RPCها می‌رساند. الزام‌آور بودنش برای اتصال Tick به تعویق افتاد و این تعویق این‌جا ثبت می‌شود، چون فراخواننده‌های آزمایشی و Mock بدون سطر factory_attempts کار می‌کنند. محدودیت باقی‌مانده: بدون factory_attempt_id، سطرهای Ledger با attempt_id تهی ثبت می‌شوند و کشف رزرو پس از راه‌اندازی تازه ممکن نیست؛ اتصال واقعی، شناسهٔ سطر factory_attempts را از Tick می‌گیرد. فراخوان دوبارهٔ attempt موفق با کلید تازه در این بسته مسدود نیست و فقط attempt با unknown باز مسدود است.
- Migration (فقط additive و timestamped، اول Scratch بعد فقط Staging): `supabase/migrations/20261031070000_gateway_safe.sql` با جدول `factory_gateway_settlements` (کلید یکتا روی idempotency_key) و جدول `factory_gateway_reconciliations` (وضعیت‌های pending_reconciliation و resolved_released و resolved_committed و referred_to_human) و تابع `settle_gateway_attempt`. هر دو جدول RLS روشن و بدون policy و فقط service_role. هیچ جدول یا تابع موجودی تغییر نکرده است. نکتهٔ شناخته‌شده: تسویه، خرج روز جاری را کم می‌کند (آینهٔ release_budget موجود) و رزروِ روز پیش، حالت لبه‌ای است.
- اثبات Staging (با تست موقت vitest که پیش از کامیت حذف شد؛ Gateway واقعی با Mock Provider و آداپتور PostgREST): پیش از اثبات، ledger با ۱۰ سطر و settlements با ۰ سطر و reconciliations با ۰ سطر بود و تنظیم daily_budget_limit برابر ۰ بود و موقتاً ۱۰۰۰۰۰۰ شد. پنج آیتم آزمایشی با پیشوند r3a-safe-test- ساخته شد و در پایان با RPC قرنطینه به cancelled رفتند و تنظیم daily_budget_limit به ۰ برگشت. ۱۱ سناریو گذشت: موفقیت Mock با مبنای simulated و واحد mock-unit؛ سقف کار ناموجود با کد budget_not_configured و صفر فراخوان Provider؛ سقف صفر با سطر rejected و صفر فراخوان؛ رزروِ نگه‌داشته‌شده که رزرو دوم نزدیک سقف را با budget_exceeded رد می‌کند (با Provider مسدودشونده که رزرو اول را در دست نگه می‌دارد)؛ timeout که رزرو را نگه می‌دارد و مصالحهٔ pending می‌سازد و آزادسازی مجاز با actor و دلیل آن را resolved_released می‌کند؛ idempotent بودن settle با همان کلید؛ replay بدون سطر تازه؛ تعارض محتوا با همان کلید؛ هزینهٔ واقعی بالاتر از رزرو با تسویه تا سقف و مصالحهٔ excess؛ رسیدن factory_attempt_id واقعی به سطرهای ledger؛ و بازیابی خرابی تسویه با retry همان نمونه (ledger_error و بعد success با همان کلید و یک سطر تسویه). وضعیت پایانی: publications با ۵۱ و outbox با ۵۱ بدون تغییر؛ settlements با ۲۵ سطر؛ reconciliations با ۴ resolved_released و ۴ pending از نوع excess که به‌عمد باز مانده‌اند و تصمیم انسانی می‌خواهند؛ آیتم‌های آزمایشی همه cancelled.
- رویداد گذرای دور پنجم اثبات (ثبت‌شده، نه پنهان‌شده): در یک دور، فراخوان اول P4 پس از رزرو و رد رزرو دوم، پیش از تسویه با خطای گذرای شبکه به Staging افتاد و رزرو ۶۰۰۰۰ روی آیتم آزمایشی r3a-safe-test-c در وضعیت نگه‌داشته‌شده ماند (خرج کار همان آیتم در پایان ۶۰۰۰۰ است). این دقیقاً رفتار Fail-closed طراحی‌شده است، نه نشت پول: هیچ سطر تسویه‌ای برای آن رزرو ننشست و رزروهای بعدی همان آیتم هم با budget_exceeded رد شدند. بازیابی همان نمونه با retry در P11 ثابت شد، ولی بازیابی پس از راه‌اندازی تازه بدون factory_attempt_id ممکن نیست و این محدودیت تا اتصال Tick می‌ماند. رفتار تسویه روی نمونه‌های چندگانهٔ Vercel و حافظهٔ مشترک هم در گیت انتشار باید تکرار شود.
- آنچه برای اتصال Attempt واقعی هنوز مانده: Tick باید شناسهٔ سطر factory_attempts را در زمان فراخوان بدهد و factory_attempt_id را الزام‌آور کند؛ به‌روزرسانی reconciliation_status روی سطر factory_attempts با اتصال Tick است؛ نگهبان سمت سرور همچنان نگهبان زمان اجراست و import صریح `server-only` همچنان باز است (بسته در package-lock نیست و ADR و تأیید صریح می‌خواهد که این سفارش نداده است).
- آزمون‌ها: `npm run verify` با کد خروج ۰ (۴۶ فایل گذشت و ۴ skip و ۳۰۶ تست گذشت و ۸ skip؛ فایل r3-gateway-contract با ۳۳ تست، از ۱۲ تست دلتای پیش)؛ بیلد با کد خروج ۰ (۱۹۲ صفحهٔ استاتیک). گریپ سکرت روی فایل‌های تازه صفر است و console.logای نمانده است.

### 9.8 مانیفست R3B: اتصال ایمن Gateway به Tick با Attempt واقعی و بازیابی پایدار (۱۴۰۵/۰۸/۰۹)

- توجه شماره‌گذاری: §9.4 سه بار مصرف شده است (R2-B و R3-A و DASH-01) و §9.5 سهم بستهٔ خواهر R2B.1 و §9.6 سهم دلتای R3-A و §9.7 سهم R3A-SAFE است؛ این مانیفست §9.8 است و در مرج، شماره‌ها باید یک‌بار بازشماری شوند.
- مبنا: شاخهٔ `rebuild/r3b-tick-connection` از `rebuild/r3a-safe` روی کامیت ac13156 (قرارداد r3-gateway-3). بدون مرج، بدون Deploy پروداکشن، بدون فراخوان واقعی یا پولی مدل، بدون انتشار محتوا یا قیمت، بدون اتصال به منابع تور، بدون تغییر داشبورد قدیم و DASH-01، بدون باز کردن Release Gate دستی.
- قرارداد (نسخهٔ `r3-gateway-4`، از `r3-gateway-3`): اتصال در سطح چرخهٔ attempt، نه در مسیر Tick. ماژول تازهٔ `site/lib/factory/tick/gateway-attempt-cycle.ts` همان ترتیب مسیر Tick را اجرا می‌کند: Claim اتمیک Step با RPC `claim_work_step_by_id`، درج سطر واقعی `factory_attempts` با attempt_no برابر attempt_count پس از Claim (دقیقاً همان کاری که مسیر Tick می‌کند)، بستن عملیات به همان attempt با اعتبارسنجی تعلق attempt به همین Work Item و Step، فراخوان Gateway با همان `factory_attempt_id`، و finish واقعی Step با RPC `finish_work_step`. Gateway هرگز خودش سطر attempt یا step نمی‌سازد. آن‌چه وصل نشده است: خود مسیر `/api/factory/tick`. هیچ قدم راهنما، هیچ قانون Scope و هیچ گیت کاندید دست نخورده است؛ آیتم‌های آزمایشی با workflow_version برابر `gateway_test_v1` و step_key برابر `gateway_model_call` ساخته شدند و مسیر Tick چنین قدمی را با گیت unknown_step_key رد می‌کند و هرگز اجرایش نمی‌کند. تکمیل Work Item (قدم complete_work) هم بیرون از این چرخه است؛ چرخه فقط Step را finish می‌کند.
- شناسهٔ پایدار عملیات منطقی: `logical_operation_id` برابر `gwop1:` به‌علاوهٔ sha256 روی Work Item و Step و نام عملیات است و به کلید idempotency یا شناسهٔ attempt وابسته نیست. هر تلاش، سطر تازه‌ای در جدول تازه با `prior_operation_id` و `retry_reason` می‌گیرد. `input_fingerprint` برابر sha256 روی محتوای پایدار درخواست است (بدون attempt و کلید) تا همان کلید با ورودی متفاوت، conflict شناخته شود.
- جدول تازه و قید دیتابیسی (Migration فقط additive و timestamped، اول Scratch با جدول‌های stub برای هدف‌های FK و بعد rollback-check روی Staging و بعد اعمال واقعی فقط روی Staging): `supabase/migrations/20261031090000_gateway_operations.sql` با جدول `factory_gateway_operations` (سطر عملیات با حالت و مبالغ و cost_basis و واحد و شمارندهٔ بادوام فراخوان و پاسخ JSON و شناسه‌های attempt) و ایندکس یکتای جزئی روی `logical_operation_id` برای حالت‌های باز (`pending` و `reserved` و `sent` و `unknown` و `response_recorded` و `settled_unreturned`) و ایندکس یکتا روی `idempotency_key`. RLS روشن و بدون policy و فقط service_role (select و insert و update)؛ anon حتی کوئری جدول را با 401 رد می‌شود، نه با آرایهٔ تهی. قید جزئی، تضمین دیتابیسی است که تلاش تازه با attempt یا کلید تازه، تا تعیین تکلیف عملیات باز، راه میان‌بری برای تکرار نیست؛ تلاش تازه فقط پس از تعیین تکلیف، با سطر تازه و دلیل ثبت‌شده ممکن است.
- حالت‌های پایدار و رفتار Recovery (فقط از دیتابیس، بدون ژورنال حافظه، بدون فراخوان Provider در بازیابی): `pending` با نبود رزرو در ledger یعنی رها‌شده (abandoned) و با بودن رزرو یعنی ارتقا به `reserved`؛ `reserved` یعنی آزادسازی کامل رزرو چون Provider هرگز صدا زده نشده است؛ `sent` یعنی نتیجه واقعاً نامعلوم (فراخوان ممکن است انجام شده باشد یا نه و پاسخِ در حافظهٔ فرایند مرده مدرک نیست) و بازیابی، مصالحهٔ unknown باز می‌کند و هرگز Provider را دوباره صدا نمی‌زند؛ `unknown` یعنی بدون اقدام تا شواهد اپراتور؛ `response_recorded` یعنی تسویه از روی پاسخ ذخیره‌شده بدون فراخوان تازه؛ `settled_unreturned` یعنی finish شدن Step از روی سطر تسویه. پاسخ، پیش از تسویه در سطر عملیات ثبت می‌شود (پوشش ثبت‌کنندهٔ Provider) و شمارندهٔ `provider_calls` در همان سطر، شمارندهٔ بادوام تلاش‌های ارسال است.
- هزینه و اضافه‌هزینه و بدهی باز: سطر عملیات، `reserved_amount` و `settled_amount` و `actual_cost` و `estimated_cost` و `unresolved_excess` و `cost_basis` و واحد را جدا نگه می‌دارد. actual بالاتر از رزرو، کامل در سطر عملیات و مصالحهٔ excess می‌ماند و تسویه تا سقف است و اضافه، بدهی باز است. نگهبان بدهی باز (Fail-closed): تا مصالحهٔ excess یک Work Item باز است، چرخهٔ هزینه‌دار تازه برای همان Work Item پیش از Claim با کد `debt_open` رد می‌شود و Provider صدا زده نمی‌شود؛ پس از resolve شدن excess، چرخهٔ تازه مجاز است. هزینهٔ Mock فقط با `cost_basis` برابر `simulated` و واحد `mock-unit` ثبت می‌شود.
- تزریق Crash (فقط آزمایشی، پیش‌فرض خاموش): ماژول `crash-test.ts` با `SimulatedCrashError` فقط وقتی `R3B_TEST_MODE` برابر `1` باشد و `R3B_TEST_CRASH_AFTER` نام مرحله را بگوید فعال می‌شود. نقطه‌ها: پس از رزرو و پیش از فراخوان (reserve)؛ پس از فراخوان و پیش از ثبت بادوام پاسخ (send)؛ پس از بازگشت Provider و پیش از تسویه (response)؛ پس از تسویه و پیش از بازگشت به Work Item (settle)؛ پس از فراخوان Gateway و پیش از finish شدن Step (return). خطای Crash شبیه‌سازی‌شده از catch فراخوان Provider دوباره بالا می‌آید و هرگز با provider_error تسویه نمی‌شود تا رزرو نگه داشته شود.
- امنیت ماژول سروری (ADR-014): `server-only` در package-lock نیست و افزودنش وابستگی تازه است؛ در این بسته اضافه نشده است. نگهبان زمان اجرا می‌ماند و تست نگهبان ثابت می‌کند با window تعریف‌شده import رد می‌شود و بدون window موفق است. در این شاخه، هیچ فایلی بیرون از دایرکتوری gateway و تست‌ها، ماژول‌های Gateway را وارد نمی‌کند.
- اثبات Staging (Mock Provider و آداپتور PostgREST واقعی؛ ۱۴ سناریوی شرح کار به‌علاوهٔ رگرسیون S4b؛ هر سناریو با آیتم آزمایشی جدا با پیشوند r3b-test-): S1 چرخهٔ کامل با attempt واقعی و هزینهٔ شبیه‌سازی‌شدهٔ ۳۰ (۱۵ توکن × ۲، mock-unit) با ۱ فراخوان Mock و ۱ فراخوان بادوام و سطرهای ledger شامل ۱ رزرو و ۱ commit؛ S2 دو چرخهٔ هم‌زمان برای یک عملیات با دقیقاً یک برنده و ۱ فراخوان و خطای operation_blocked برای بازنده و دقیقاً ۱ سطر attempt؛ S3 سقف ناموجود (سطر کار نیست) با budget_not_configured و ۰ فراخوان و بدون سطر rejected، سقف صفر با budget_exceeded و ۱ سطر rejected و ۰ فراخوان، سقف کافی با موفقیت؛ S9 replay همان کلید بدون فراخوان تازه و بدون سطر تازه و conflict همان کلید با ورودی متفاوت؛ S10 تلاش تازه با کلید تازه تا تعیین تکلیف با operation_blocked و تکرار همان attempt با کلید تازه با reconciliation_pending و پس از resolve با release، تلاش تازه با prior_operation_id و دلیل، موفق؛ S11 actual برابر ۳۰ در برابر رزرو ۱۰ با تسویهٔ ۱۰ و excess برابر ۲۰ و نگهبان بدهی باز با debt_open و پس از commit شدن excess، چرخهٔ تازه موفق؛ S12 timeout با رزرو نگه‌داشته‌شده و بدون retry کورکورانه؛ S13 رد بودجه با ۰ فراخوان؛ S14 انکار anon با 401 و خواندن service_role. سناریوهای Crash در فرایند چرخه و بازیابی در فرایند کاملاً تازهٔ جداگانه (PIDهای جدا در لاگ اثبات، بدون حافظهٔ مشترک و بدون فایل واسط؛ کلیدها قطعی و شناسهٔ منطقی از روی Work Item دوباره محاسبه می‌شود): S4 رزرو بدون ارسال با ۰ فراخوان و بازیابی به released؛ S5 ارسال بدون پاسخ با ۱ فراخوان و بازیابی به unknown با مصالحهٔ باز و بدون فراخوان تازه؛ S6 پاسخ ذخیره‌شده بدون تسویه با بازیابی به settled از روی پاسخ ذخیره‌شده و commit برابر ۳۰ و بدون فراخوان تازه؛ S7a تسویه‌شده بدون finish با بازیابی به settled و Step موفق؛ S7b حالت settled_unreturned با بازیابی به settled و Step موفق.
- باگ پیدا‌شده در راستی‌آزمایی پایانی و رفع آن (ثبت‌شده، نه پنهان‌شده): در بازیابی S4، Step عملیات آزادشده به‌اشتباه succeeded finish شد، چون finishStoredOutcome هر سطر تسویه‌ای، حتی تسویهٔ صرفاً آزادسازی (commit تهی) را موفقیت می‌دانست. ترتیب شاخه‌ها اصلاح شد: حالت‌های پایانی آزادشده و ارجاع‌شده و ناموفق پیش از شاخهٔ تسویه بررسی می‌شوند و شاخهٔ موفقیت فقط تسویه با commit غیرتهی را موفق می‌داند. رگرسیون S4b با آیتم تازه ثابت کرد: بازیابی عملیات آزادشده، Step را blocked با خطای timeout finish می‌کند و سطرهای ledger شامل ۱ رزرو و ۱ release و ۰ commit است. سطر Step آیتم S4 با وضعیت succeeded به‌عنوان اثر آزمایشی همان باگ در Staging مانده است (آیتم cancelled است و هیچ اثری روی Production ندارد).
- وضعیت پایانی Staging (راستی‌آزمایی هماهنگ‌کننده از دیتابیس): تنظیم daily_budget_limit به ۰ برگشت؛ هر ۱۷ آیتم آزمایشی با RPC قرنطینه به cancelled رفتند (۱۷ سطر لاگ قرنطینه با actor برابر r3b-operator)؛ Stepها با ۱۲ succeeded و ۲ failed (سقف صفر) و ۳ blocked (دو unknown باز و یک S4b)؛ عملیات با ۱۲ settled و ۳ released و ۲ failed و ۲ unknown؛ مصالحه‌ها با ۱ excess برابر resolved_committed و ۱ unknown برابر resolved_released و ۲ unknown برابر pending_reconciliation که به‌عمد باز مانده‌اند (اثرهای آزمایشی S5 و S12 و فقط آیتم‌های خودشان را نگه می‌دارند)؛ settlements با ۴۱ سطر؛ publications با ۵۱ و outbox با ۵۱ بدون تغییر؛ ledger در مجموع ۱۳۱ سطر.
- آنچه برای Provider واقعی هنوز مانده: Provider واقعی و credential آن؛ تصمیم سیم‌کشی چرخه به مسیر Tick (در برابر همین چرخهٔ جداگانه)؛ import صریح `server-only` با تأیید وابستگی؛ تعیین تکلیف ۲ مصالحهٔ unknown باز آزمایشی S5 و S12 (نیاز به تصمیم انسانی، ولی فقط Staging)؛ رفتار تسویه روی نمونه‌های چندگانهٔ Vercel با حافظهٔ مشترک در گیت انتشار باید تکرار شود؛ سقف ناموجود روی Staging با سطر کار غایب آزمون شد، چون ستون budget_limit روی جدول NOT NULL با پیش‌فرض صفر است و سقف null ذخیره‌شده نمی‌تواند وجود داشته باشد (حالت null فقط در آداپتور محلی با تست واحد پوشش دارد).
- آزمون‌ها: `npm run verify` با کد خروج ۰ (۴۸ فایل گذشت و ۶ skip؛ ۳۱۷ تست گذشت و ۲۹ skip؛ تست‌های واحد تازه شامل ۹ تست اتصال و ۲ تست نگهبان و ۳۳ تست قرارداد؛ تست‌های Staging شامل ۱۵ تست چرخه و ۶ تست بازیابی که بدون متغیرهای Staging skip می‌شوند و در اثبات Staging جداگانه با متغیرها اجرا شدند)؛ بیلد با کد خروج ۰ (۱۹۲ صفحهٔ استاتیک). گریپ سکرت روی فایل‌های تازه صفر است و console.logای نمانده است.
