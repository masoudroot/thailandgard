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

### 9.4 مانیفست R2-B: خواندن نسخه‌ای راهنما پشت پرچم CONTENT_READ_MODE (۱۴۰۵/۰۸/۰۸)

- مبنا: شاخهٔ `rebuild/r2b-versioned-read` منشعب از `rebuild/factory-r2` روی کامیت `510dae5`؛ بدون مرج، بدون PR، بدون دیپلوی Preview، بدون تغییر Production. فعال‌سازی Preview، گام گیت انتشار است نه این بسته.
- یافتهٔ معماری (دلیل چرخش از حالت زمان درخواست به حالت زمان بیلد): ریشهٔ layout پروژه `ensureStatic = "navigation"` دارد با کامنت «همهٔ مسیرها استاتیک‌اند؛ هر رندر درخواستیِ آینده بیلد را قرمز می‌کند». در cacheComponents، مسیری با `generateStaticParams`، «کاملاً استاتیک» پیکربندی می‌شود و `connection()` در آن خطای بیلد می‌دهد نه خروج از پیش‌رندر؛ و حذف `generateStaticParams` هم خطای «ensureStatic نیازمند generateStaticParams» می‌دهد؛ و فرزند نمی‌تواند سطح ضعیف‌تر از پدر بگذارد. پس `CONTENT_READ_MODE`، متغیر محیطی زمان بیلد است: بیلد versioned صفحه‌های نسخه‌ای را پیش‌رندر می‌کند، بیلد legacy صفحه‌های legacy را، و جابه‌جایی اشاره‌گر، بیلد تازه با کش پاک‌شده می‌خواهد. دست نزدن به قانون استاتیک ریشه، کوچک‌ترین تغییر مؤثر بود؛ ضعیف کردن آن، گسترش محدوده می‌شد.
- پرچم (`site/lib/guide-versioned-read.ts`): سه مقدار `legacy` و `versioned` و `shadow_compare`؛ نبودن یا نامعتبر بودن متغیر هم `legacy` می‌شود. فقط دو slug در Scope است: `best-time-to-visit-thailand` و سند آزمایشی `r2b-test-doc`؛ بقیهٔ slugها همیشه legacy می‌مانند (در بیلد versioned، راهنمای `thailand-visa-guide` با سرور R2A.1 در عنوان و canonical و نوع‌های LD و طول و هش متن قابل‌مشاهده، یکسان بود).
- مسیر خواندن نسخه‌ای: از `content_documents` به `published_version_id`، بعد نسخهٔ همان شناسه از `content_versions` با کلید service_role سمت سرور (RLS نسخه‌ها برای anon فقط نسخهٔ منتشرشده را نشان می‌دهد و اثبات اشاره‌گر غیر منتشرشده، service_role می‌خواهد)؛ اعتبارسنجی payload با `validatePublishPayload`؛ نگاشت به مدل Guide و رندر عنوان و متادیتا و canonical و بخش‌ها و FAQ از همان نسخه. نبودن document یا نسخه، خطای صریح `VersionedReadError` با کدهای `DOCUMENT_NOT_FOUND` و `VERSION_NOT_FOUND` و `VERSION_MISMATCH` و `UPSTREAM_ERROR` و `NOT_CONFIGURED` می‌دهد، نه fallback بی‌صدا. خواندن کش‌دار (`site/lib/guide-versioned-read-cached.ts`، پوستهٔ `"use cache"` با تگ `versioned-guides`) جدا نگه داشته شد تا lib نسخه‌ای در تست واحد بدون ران‌تایم نکست بماند؛ چون دادهٔ بی‌کش در صفحه یا متادیتا، با `ensureStatic = "navigation"` خطای بیلد می‌دهد.
- حالت shadow_compare: صفحه legacy رندر می‌شود و مقایسه با میدان‌های title و metadata و canonical و بخش‌ها و FAQ و هش sha256 متن قابل‌مشاهدهٔ هر دو حالت ثبت می‌شود؛ مقایسه هرگز چیزی منتشر نمی‌کند. ثبت، فایل JSONL با مسیر `SHADOW_COMPARE_LOG_PATH` به‌علاوهٔ خط لاگ فقط در فاز بیلد است: مهر زمانی logger بیرون از فاز بیلد، رندر استاتیک درخواستی را مسموم می‌کند (bailout) حتی وقتی خط نوشته شده باشد؛ پس بیرون از بیلد، لاگ صدا زده نمی‌شود و فایل تنها شاهد است. رکورد، مهر زمانی ندارد (همان دلیل) و رندر صفحه دو بار اجرا می‌شود (HTML و RSC) و هر دو بار همان خط را می‌نویسند؛ دو خط یکسان، یک رویداد است. در اثبات زنده: راهنمای واقعی `equal: false` با تفاوت فقط `sections` و `visibleHash` بود (عنوان و توضیح و canonical و FAQها یکسان، هر دو ۳ بخش و ۲ FAQ، هش legacy با `e2c8f0cb` و هش نسخه‌ای با `e5eae7a3` شروع می‌شود، نسخهٔ ۲۲ با هش کامل `3e546b4f...`؛ یعنی تفاوت فقط در متن پاراگراف‌های بخش‌هاست، نه سرفصل‌ها) و سند آزمایشی در shadow، ۴۰۴ با رکورد `available: false` و خطای `legacy guide not found for slug r2b-test-doc` داد.
- اثبات rollback بدون دست زدن به راهنمای واقعی (اشاره‌گرش روی نسخهٔ ۲۲ ماند): سند آزمایشی `r2b-test-doc` با چهار نسخه ساخته شد؛ نسخه‌های ۱ و ۲ با h1 تهی، در تولید درخواستی با warn نگاشت h1 و مهر زمانی logger، bailout می‌دادند و کنار گذاشته شدند؛ نسخه‌های ۳ و ۴ همان محتوا با h1 برابر عنوان‌اند (هش نسخهٔ ۳ با `f6ec82d3` و نسخهٔ ۴ با `69a40d84` شروع می‌شود). اشاره‌گر روی ۳ محتوای اول، روی ۴ محتوای دوم، و بازگشت به ۳ دوباره محتوای اول را داد؛ اشاره‌گر تهی، ۵۰۰ با `VERSION_NOT_FOUND` در لاگ داد و بعد اشاره‌گر به ۳ برگشت. راهنمای واقعی در بیلد versioned، محتوای نسخهٔ ۲۲ را نشان داد و با legacy فرق کرد؛ این تفاوت، صادقانه تفاوت محتوای آزمایشی R2-A با جداول legacy است نه خرابی.
- تغییرناپذیری legacy و سئو (مقایسهٔ سرور R2A.1 روی ۳۱۰۰ با بیلد legacy همین کد روی ۳۱۰۲): خانه و راهنمای واقعی و تور `phuket-7-days` در عنوان و canonical و نوع‌های LD و طول و هش متن قابل‌مشاهده، یکسان؛ `robots.txt` بایت‌به‌بایت یکسان (۹۴ بایت، همان robots تولید)؛ `sitemap.xml` در هر دو ۲۹ URL و بایت‌به‌بایت یکسان (سند آزمایشی به sitemap نشت نکرد)؛ سند آزمایشی در legacy روی هر دو سرور ۴۰۴ است. یک ۵۰۰ گذرا روی صفحهٔ تور سرور قدیمی در تلاش اول دیده شد و تلاش دوم ۲۰۰ داد؛ پیشینهٔ سرور قدیمی است نه این تغییر (تورها در diff نیستند).
- آزمون‌ها: `npm run verify` با کد خروج ۰ (۴۶ فایل گذشت و ۴ skip و ۲۹۰ تست گذشت و ۸ skip؛ ۱۷ تست تازهٔ `r2b-read-mode`)؛ بیلد با کد خروج ۰ در هر سه حالت (هر سه ۱۹۲ صفحهٔ استاتیک؛ سند آزمایشی چون در `generateStaticParams` نیست، درخواستی تولید می‌شود). شمارش انتشارها پیش و پس از shadow یکسان ماند: انتشار ۵۱ (verified ‏۴۶، needs_intervention ‏۴، pending ‏۱) و outbox رویداد ۵۱ (succeeded ‏۴۶، failed ‏۵).
- Migrationهای R2-B: هیچ Migration تازه‌ای لازم نبود؛ جدول‌های نسخه‌بندی از R1 آماده‌اند، پرچم فقط متغیر محیطی است و گزارش مقایسه بیرون از دیتابیس می‌نشیند. هیچ تغییر Production، هیچ Push، هیچ PR، هیچ Merge.
- تذکر شماره‌گذاری: این بخش در این شاخه `9.4` است؛ مسیر خواهر R3-A هم مانیفست خودش را `9.4` گذاشته است؛ در مرج، یکی باید شماره‌گذاری دوباره شود.

### 9.5 مانیفست R2B.1: خواندن نسخه‌ای در Runtime با Revalidation بدون Build (۱۴۰۵/۰۸/۰۸)

- مبنا: شاخهٔ `rebuild/r2b1-runtime-read` منشعب از `rebuild/r2b-versioned-read` روی کامیت `97f1e18`؛ بدون مرج، بدون PR، بدون دیپلوی Preview، بدون تغییر Production. فعال‌سازی Preview، گام گیت انتشار است نه این بسته.
- مسئله: در R2-B، حالت و Pointer نسخه در زمان Build خوانده می‌شدند و تغییر `published_version_id` بعد از Build در صفحه دیده نمی‌شد. هدف این بسته، دیده شدن تغییر Pointer با Revalidation و بدون Build مجدد است، فقط روی Staging و فقط برای سند آزمایشی.
- بررسی دو گزینه پیش از پیاده‌سازی (سند Next 16.4 در `node_modules/next/dist/docs` خوانده شد): گزینهٔ ۱، حفظ مسیر Static با Cache Tag و Revalidation معتبر؛ گزینهٔ ۲، خواندن Runtime با مسیر dynamic. گزینهٔ ۲ رد شد، چون ریشهٔ layout، `ensureStatic = "navigation"` دارد و سند می‌گوید فرزند نمی‌تواند سطح ضعیف‌تر از پدر بگذارد و دادهٔ بی‌کش و `connection()` در صفحه، حتی داخل Suspense، خطای بیلد می‌دهند؛ سه تلاش dynamic در R2-B هم بیلد را قرمز کرده بود. ضعیف کردن قانون ریشه، همهٔ مسیرها را درگیر می‌کند و گسترش محدوده است. گزینهٔ ۱ انتخاب شد: کم‌ریسک‌تر، بدون دست زدن به قانون ریشه، با حفظ سئو.
- سازوکار انتخاب‌شده: پوستهٔ `"use cache"` با تگ `versioned-guides` از R2-B سر جایش ماند؛ نام تگ به ثابت واحد `VERSIONED_GUIDES_CACHE_TAG` در `site/lib/guide-versioned-read.ts` رفت تا پوسته و مسیر باطل‌سازی هرگز از هم نپاشند. مسیر تازهٔ `POST /api/internal/revalidate-versioned-guide` (توکن‌دار با `checkAuth`، همان الگوی process-outbox؛ نبودن توکن یعنی 503 و توکن نادرست یعنی 401) فقط slugهای `VERSIONED_READ_SLUGS` را می‌پذیرد (بیرون از Scope یعنی 400) و `revalidateTag` با `{ expire: 0 }` و `revalidatePath` صفحه را صدا می‌زند؛ سند Next 16.4 می‌گوید با expire 0، محتوای کهنه هرگز سرو نمی‌شود و درخواست بعدی، Revalidation مسدودکننده است. `updateTag` در Route Handler در دسترس نیست (سند: فقط Server Action) و این‌جا صدا زده نمی‌شود. مسیر، چیزی منتشر نمی‌کند و Pointer را عوض نمی‌کند؛ فقط کش را باطل می‌کند.
- اثبات زنده روی Staging (سرور ۳۱۰۵، بیلد versioned؛ سرور مرجع ۳۱۰۰ دست نخورد): بیلد با اشاره‌گر نسخهٔ ۳ (محتوای اول)؛ درخواست صفحه، نسخهٔ A را داد. اشاره‌گر به نسخهٔ ۴ رفت و پیش از باطل‌سازی، صفحه هنوز A را با HIT داد (پس تغییر اشاره‌گر به‌تنهایی صفحه را عوض نکرد)؛ پس از POST باطل‌سازی، صفحه B را با MISS داد، با canonical ثابت و مجموعهٔ نوع‌های LD ثابت. برگرداندن اشاره‌گر به ۳ و باطل‌سازی، دوباره A را داد؛ همه بدون Build. اشاره‌گر تهی و باطل‌سازی، ۵۰۰ با نشان NONE داد (نه fallback به legacy) و برگرداندن اشاره‌گر، دوباره A را داد. پس از توقف و شروع دوبارهٔ ۳۱۰۵، چرخهٔ A به B به A با همان رفتار تکرار شد. باطل‌سازی مسیر راهنمای واقعی، صفحهٔ پیش‌رندرشده را از HIT به MISS برد و محتوایش همچنان v22 ماند (اشاره‌گرش هرگز جابه‌جا نشد). legacy بدون تغییر ماند: خانه (متن قابل‌مشاهده یکسان؛ اختلاف بایت خام فقط نویز RSC است) و تور `phuket-7-days` (عنوان و canonical و متن یکسان؛ ۵۰۰ گذرای سرور قدیمی در تلاش اول، در تلاش دوم ۲۰۰ شد، همان رفتار R2-B) و `robots.txt` و `sitemap.xml` بایت‌به‌بایت با سرور مرجع یکسان‌اند و سند آزمایشی به sitemap نشت نکرد. بیلد دوم با حالت `shadow_compare` (سرور ۳۱۰۶) هم سبز شد: رکورد مقایسهٔ راهنمای واقعی با `versionNo` برابر ۲۲ و تفاوت فقط `sections` و `visibleHash` (هش legacy با `e2c8f0cb` و هش نسخه‌ای با `e5eae7a3`، همان R2-B) و سند آزمایشی ۴۰۴ با رکورد `available: false`؛ باطل‌سازی مسیر راهنمای واقعی در حالت shadow، مقایسه را دوباره محاسبه کرد و دو رکورد تازه با `versionNo` برابر ۲۲ ساخت. شمارش انتشارها و outbox پیش و پس از همهٔ آزمون‌ها یکسان ماند: انتشار ۵۱ (verified ‏۴۶، needs_intervention ‏۴، pending ‏۱) و outbox رویداد ۵۱ (succeeded ‏۴۶، failed ‏۵). اشاره‌گر سند آزمایشی در پایان به ۳ برگشت و اشاره‌گر راهنمای واقعی روی ۲۲ ماند.
- محدودیت اثبات: تغییر محتوای صفحهٔ پیش‌رندرشدهٔ راهنمای واقعی، بدون جابه‌جایی اشاره‌گرش (که ممنوع است) مستقیماً قابل مشاهده نیست؛ آن‌چه مشاهده شد، باطل شدن کش پیش‌رندر (HIT به MISS) با محتوای ثابت v22 است. برای صفحه‌های درخواستی (سند آزمایشی)، تغییر محتوا مستقیماً ثابت شد. سازوکار (همان تگ و همان تابع کش) برای هر دو یکی است.
- انحراف و مسدودکننده: علامت‌گذاری ۴ نسخهٔ سند آزمایشی با `is_test_fixture` برابر true ممکن نشد: UPDATE روی `content_versions` با خطای `content_versions are immutable` رد می‌شود، چون دو تریگر `content_versions_no_update` و `content_versions_no_delete`، تابع تغییرناپذیری R1 را صدا می‌زنند که بی‌قیدوشرط RAISE می‌کند. غیرفعال کردن تریگر، نقض طراحی تغییرناپذیری است و انجام نشد. جداسازی سند آزمایشی با slug یکتای staging-only و نبودن در `generateStaticParams` و sitemap و ۴۰۴ در legacy سر جایش است؛ مسیر درست برای آینده، درج نسخه‌های fixture تازه با `is_test_fixture` برابر true در زمان INSERT است.
- آزمون‌ها: `npm run verify` با کد خروج ۰ (۴۶ فایل گذشت و ۴ skip و ۲۹۳ تست گذشت و ۸ skip؛ تست تازهٔ باطل‌سازی ۳ تست، مجموع فایل `r2b-read-mode` به ۲۰ تست رسید)؛ بیلد با کد خروج ۰ در حالت versioned (۱۹۳ صفحه) و در حالت shadow_compare (۱۹۳ صفحه). مسیر تازه در جدول روت‌ها dynamic است و صفحهٔ راهنما partial-prerender.
- Migrationهای R2B.1: هیچ Migration تازه‌ای لازم نبود؛ جدول‌های نسخه‌بندی از R1 آماده‌اند و مسیر باطل‌سازی، جدول تازه نمی‌خواهد. هیچ تغییر Production، هیچ Push، هیچ PR، هیچ Merge.
- تذکر شماره‌گذاری: این بخش `9.5` است؛ `9.4` هم‌اکنون سه بار مصرف شده است (R2-B و R3-A و DASH-01) و شماره‌گذاری دوبارهٔ آن‌ها کار زمان مرج است.
