# معماری کارخانه خودمختار تایلندگرد — نسخه ۲

**وضعیت:** تأییدشده برای طراحی؛ پیاده‌سازی آغاز نشده است.
**تاریخ:** ۲۰۲۶-۱۰-۲۰
**جایگزین:** `docs/ARCHITECTURE.md` و `docs/GROWTH-ENGINE.md` (معماری قدیمی ۱۳ تیم / ۳ موج)
**دامنه:** موتور چرخه و داشبورد. سایت عمومی، محتوا و SEO موجود حفظ می‌شوند.

---

## ۱. زمینه و هدف

سیستم فعلی یک خط لولهٔ اجرای تسک است: تیم‌ها پلن ساعتی را اجرا می‌کنند، گزارش می‌نویسند و در بهترین حالت یک چرخه را کامل می‌کنند. این سیستم:

- مالک دامنه ندارد؛ فقط executor دارد.
- استراتژی، تقویم محتوا، برنامهٔ لینک‌سازی و رادار تخصصی را به‌صورت مستمر اداره نمی‌کند.
- اثر واقعی تغییرات را اندازه نمی‌گیرد.
- با قفل چرخه، صف deploy و وضعیت‌های نیمه‌کاره شکننده است.
- تصمیم انتشار را بر اساس نوع تغییر و ریسک نمی‌گیرد.

هدف نسخهٔ ۲ تبدیل این خط لوله به یک **کارخانهٔ دوحلقه‌ای** است:

1. **حلقهٔ عملیات دامنه:** هر تیم به‌عنوان مالک دامنه، رادار، استراتژی، Playbook و KPI دارد.
2. **حلقهٔ اجرای WorkItem:** هر تغییر مستقل، با DAG، شواهد، Gate، Policy و Release اتمیک اجرا می‌شود.

خروجی نهایی: تغییرات کم‌ریسک با کیفیت قابل‌اثبات و بدون دخالت انسان منتشر می‌شوند؛ تغییرات پرریسک در نقطهٔ درست به انسان می‌رسند؛ هر انتشار به یک نتیجهٔ قابل‌اندازه‌گیری وصل است.

### اهداف

- حفظ کامل سایت عمومی، URLها، محتوا و SEO موجود در طول مهاجرت.
- اجرای هم‌زمان و مستقل WorkItemها بدون قفل جهانی.
- استراتژی و اجرا در یک چارچوب قابل‌ردیابی.
- کیفیت چندلایه با شواهد امضاشده.
- انتشار ریسک‌محور با rollback سریع.
- اندازه‌گیری اثر و بازخورد به Playbook.
- نگهداری کم و اجرای managed.

### غیراهداف

- بازطراحی برند یا ساخت سایت جدید.
- انتقال محتوا به CMS جدید.
- جایگزینی Vercel یا Git.
- حذف نظارت انسان روی تصمیم‌های پرریسک.
- ساخت یک پلتفرم چندمستاجری.

---

## ۲. اصول طراحی

1. **مالکیت دامنه:** هر تیم صاحب استراتژی، اجرا، کیفیت و KPI دامنهٔ خودش است.
2. **دو حلقه، یک حقیقت:** استراتژی در حلقهٔ دامنه، اجرا در حلقهٔ WorkItem؛ هر دو روی یک Event Log.
3. **بدون قفل جهانی:** واحد اجرا WorkItem است، نه Cycle.
4. **Git منبع حقیقت سایت:** همهٔ تغییرات محتوا و کد از Git عبور می‌کنند.
5. **هیچ نوشتن مستقیمی روی production:** مسیر sandbox → preview → policy → release.
6. **Evidence-first:** ادعای «انجام شد» بدون شاهد امضاشده معتبر نیست.
7. **ریسک‌محور، نه مرحله‌محور:** Gate و تأیید بر اساس ریسک و blast radius.
8. **Fail-closed:** ریسک ناشناخته، Gate نامشخص یا evidence گمشده = توقف.
9. **Maker-checker:** نویسنده تأییدکنندهٔ نهایی نیست.
10. **Vendor-neutral:** مدل و ابزار پشت Gateway؛ قابل تعویض بدون بازنویسی دامنه.
11. **Managed و کم‌نگهداری:** GitHub Actions و Vercel به‌عنوان runtime و release، managed Postgres و object storage.
12. **قابل بازسازی:** projection‌ها از Event Log بازسازی می‌شوند؛ state جاری در Event Log است.

---

## ۳. مرز سیستم

```text
┌──────────────────────────────────────────────────────────────┐
│ سایت عمومی و محتوای موجود                                     │
│ Next.js / Vercel / Git / Supabase site data                  │
│ در طول مهاجرت دست‌نخورده می‌ماند.                              │
└──────────────────────────────┬───────────────────────────────┘
                               │ preview / production release
┌──────────────────────────────▼───────────────────────────────┐
│ Factory v2                                                    │
│ Control Plane / Domain Ops / WorkItem Runtime / Gates         │
│ Policy / Release / Outcome / Dashboard                        │
└───────┬──────────────────┬──────────────────┬─────────────────┘
        │                  │                  │
   GitHub App          Vercel API       GSC / Analytics
   (branch/PR)         (deploy)          (signals/outcome)
        │                  │                  │
   Object Storage     Managed Postgres   Model/Tool Gateways
   (artifacts)        (projections)      (LLM, SEO, CMS, ...)
```

### سیستم‌های خارجی

| سیستم | نقش | مرز اعتماد |
|---|---|---|
| GitHub | منبع حقیقت کد و محتوا؛ branch و PR | GitHub App با دسترسی حداقلی |
| Vercel | preview و production | مسیر release با token محدود |
| Supabase | دادهٔ سایت و auth داشبورد | فقط خواندن/نوشتن دامنهٔ سایت |
| GitHub Actions | اجرا و زمان‌بندی WorkItemها | توکن محدود به ریپو |
| Managed Postgres | projection و گزارش عملیاتی | جدا از DB سایت |
| Object Storage | artifact، screenshot، trace، patch | دسترسی امضاشده |
| Model Gateway | مسیریابی مدل بر اساس capability | بدون کلید خام در اجراکننده |
| Tool Gateway | GSC، crawler، CMS، analytics، ... | مجوز per-domain |
| Secret Manager | secretها و tokenهای کوتاه‌عمر | هیچ secret در repo یا log |

---

## ۴. نمای کلی معماری

```text
Business Goals / KPIs / Portfolio
                │
                ▼
        Portfolio Governor (Leader)
        ├─ OKR، بودجه، ظرفیت، اولویت
        └─ داوری تعارض بین‌دامنه‌ای
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ حلقهٔ بیرونی: Domain Operations                              │
│ Radar → Analyze → Decide → Update Playbook → Create WorkItem│
│ SEO ساعتی/روزانه، Content روزانه، Tour فصلی، Design دوره‌ای، │
│ Dev پیوسته، Leader روزانه/هفتگی                              │
└─────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ حلقهٔ داخلی: WorkItem Execution                              │
│ Plan DAG → Execute → Domain Review/Veto → Quality Gates      │
│ → Policy → Preview → Release → Health → Outcome              │
└─────────────────────────────────────────────────────────────┘
                │
                ▼
        Outcome Measurement
   (ranking, conversion, margin, UX, reliability)
                │
                └────────► Domain Scorecards
                           → Playbook updates
                           → Portfolio Governor
```

### اجزای اصلی

| جزء | مسئولیت | مالک |
|---|---|---|
| Portfolio Governor | OKR، بودجه، اولویت، ظرفیت، داوری | Leader |
| Domain Operations | رادار، تحلیل، تصمیم، Playbook، KPI | هر شش دامنه |
| Planning | تبدیل سیگنال به WorkItem و DAG | Leader + domain owner |
| WorkItem Runtime | اجرای DAG، retry، timeout، قفل منابع | runner درون‌فرآیندی |
| اجراکننده‌های نقش | اجرای تخصصی Taskها | هر نقش |
| Sandbox Executor | build/test/browser/security scan | Dev platform |
| Gate Engine | اجرای Quality Gateها و تولید evidence | Quality |
| Policy Engine | تصمیم ریسک و مسیر تأیید | Governance |
| مسیر Release | merge queue، deploy، health، rollback | Dev platform |
| مسیر Outcome | اندازه‌گیری اثر انتشار | Leader + domains |
| Control API | فرمان‌های داشبورد و agentها | Platform |
| Projector | ساخت read model از Event Log | Platform |
| Dashboard | مشاهده و کنترل، نه orchestration | Platform |

---

## ۵. مدل دامنه

### ۵.۱ موجودیت‌ها

| موجودیت | نقش | فیلدهای کلیدی |
|---|---|---|
| `Signal` | ورودی خام یا تحلیل‌شده از رادار | `id`, `source`, `domain`, `kind`, `payload`, `observed_at`, `confidence` |
| `WorkItem` | واحد تغییر قابل‌انتشار | `id`, `domain`, `owner_role`, `risk`, `status`, `playbook_version`, `policy_version`, `kpi_target`, `outcome_window`, `budget` |
| `Task` | گره DAG | `id`, `work_item_id`, `type`, `role`, `status`, `attempt`, `depends_on`, `contract` |
| `Artifact` | خروجی ملموس | `id`, `kind`, `hash`, `uri`, `producer`, `lineage` |
| `Evidence` | شاهد قابل‌استناد | `id`, `kind`, `hash`, `uri`, `gate`, `created_by`, `signature` |
| `Decision` | تصمیم ثبت‌شده | `id`, `subject`, `actor`, `authority`, `decision`, `rationale`, `evidence_refs` |
| `Release` | انتشار | `id`, `work_item_id`, `commit_sha`, `artifact_hash`, `evidence_bundle_hash`, `policy_decision_id`, `status` |
| `Run` | تلاش اجرای یک مرحله | `id`, `runner_execution_id`, `task_id`, `attempt`, `started_at`, `finished_at`, `error` |
| `Policy` | قاعدهٔ نسخه‌دار | `id`, `version`, `scope`, `rules`, `effective_at` |
| `KnowledgeItem` | دانش دامنه | `id`, `domain`, `kind`, `content`, `source`, `valid_from`, `valid_to` |
| `Playbook` | استراتژی و قرارداد دامنه | `id`, `domain`, `version`, `sections`, `owner`, `reviewed_at` |
| `Outcome` | اثر انتشار | `id`, `release_id`, `metric`, `window`, `value`, `baseline`, `attribution` |
| `DomainScorecard` | وضعیت KPI دامنه | `domain`, `period`, `metrics`, `trend`, `updated_at` |

### ۵.۲ چرخهٔ عمر

```text
WorkItem:
intake → planned → ready → running → verifying
      → awaiting_approval? → releasing → production_verified → done
      ↘ blocked / failed / canceled / rolled_back

Task:
pending → ready → running → verifying → done
        ↘ blocked / failed / canceled

Release:
candidate → preview_ready → gates_passed → policy_approved
          → [human_approved?] → deploying → healthy
          → measured
          ↘ rolled_back / failed
```

قواعد:

- `blocked` همیشه دلیل ساخت‌یافته و مالک رفع دارد.
- `failed` با evidence و trace ذخیره می‌شود؛ retry کورکورانه ممنوع.
- `canceled` فقط با actor مجاز و دلیل.
- `rolled_back` یک Release جدید نیست؛ وضعیت همان Release با ارجاع به rollback target است.

### ۵.۳ DAG

- هر WorkItem یک DAG از Taskها دارد؛ گره‌ها می‌توانند موازی باشند.
- گره‌های اجباری: `plan`، `domain_review`، `quality_gates`، `policy_decision`، `release`، `outcome_check`.
- `domain_review` می‌تواند وتو کند؛ وتو یک Decision با evidence است.
- Taskها قرارداد ورودی/خروجی JSON Schema دارند.
- وابستگی‌ها صریح‌اند؛ حلقه ممنوع است.
- هر Task سقف زمان، توکن، هزینه و تلاش دارد.

### ۵.۴ قفل منابع و هم‌زمانی

منابع قفل‌شدنی:

- صفحه/URL
- تور
- کامپوننت/Design token
- شاخه Git
- محیط preview
- فایل migration
- کمپین لینک‌سازی
- سرویس/API

قواعد:

- قفل در سطح منبع، نه کل کارخانه.
- قفل با `resource_key` و `holder_run_id` و TTL.
- WorkItemهای هم‌پوشان در یک منبع سریالی می‌شوند؛ بقیه موازی می‌مانند.
- قفل مرده با heartbeat آزاد می‌شود.
- `idempotency_key` برای همهٔ اثرات جانبی اجباری است.

### ۵.۵ بودجه و اولویت

- هر WorkItem بودجهٔ `tokens`, `cost_usd`, `wall_clock`, `attempts` دارد.
- هر دامنه سهمیهٔ ماهانه/هفتگی دارد؛ Leader آن را تعیین می‌کند.
- اولویت از ترکیب اثر تجاری، ریسک، فوریت و وابستگی محاسبه می‌شود.
- عبور از بودجه = توقف و escalation، نه ادامهٔ خاموش.

---

## ۶. نقش‌ها و منشور دامنه

هر تیم چهار لایه مسئولیت دارد: **استراتژی و برنامه → تولید و اجرا → بازبینی و کیفیت → اندازه‌گیری و بهبود**. تیم در دامنهٔ خودش می‌تواند WorkItem بسازد؛ خارج از دامنه، هماهنگی با مالک لازم است.

### ۶.۱ Leader — مالک پورتفوی

- **مأموریت:** حداکثر کردن اثر مجموعه، نه تعداد تسک.
- **مالکیت:** OKR، اولویت، ظرفیت، بودجه، ریسک پورتفوی، وابستگی‌ها، داوری تعارض.
- **مسئولیت مستمر:** تحلیل KPI، forecasting، بازبینی پورتفوی، مدیریت blockedها.
- **خروجی:** Portfolio Plan، WorkItemهای سطح بالا، Decisionهای اولویت، بودجهٔ دامنه‌ها.
- **KPI:** throughput، cycle time، cost per outcome، forecast accuracy، سهم کارهای دارای اثر.
- **حق وتو:** توقف WorkItem خارج از استراتژی یا بودجه.

### ۶.۲ Tour Manager — مالک محصول و واقعیت تجاری تور

- **مأموریت:** پورتفوی تور سودآور، به‌روز و قابل‌فروش.
- **مالکیت:** قیمت‌گذاری، بسته‌بندی، حاشیه، فصلی‌بودن، ظرفیت، قوانین رزرو/لغو، دادهٔ تأمین‌کننده، انطباق، موقعیت‌یابی پیشنهاد.
- **مسئولیت مستمر:** رصد بازار و رقبا، به‌روزرسانی فصل/قیمت/ظرفیت، بازبینی صحت داده، ساخت/بازنشستگی تور.
- **خروجی:** Tour Spec، Offer Calendar، Fact Sheet، قواعد قیمت، brief محتوای تور.
- **KPI:** conversion، margin، booking volume، cancellation، data accuracy، time-to-market.
- **حق وتو:** صحت دادهٔ تجاری و قیمت.

### ۶.۳ Content — مالک استراتژی، معماری و کیفیت محتوا

- **مأموریت:** محتوای دقیق، قابل‌اعتماد و اثرگذار در کل چرخهٔ عمر.
- **مالکیت:** استراتژی محتوا، تقویم تحریریه، لحن برند، معماری اطلاعات محتوایی، سیاست استناد، ویراستاری، بومی‌سازی، content design.
- **مسئولیت مستمر:** تحقیق مخاطب، topic cluster با SEO، تولید brief، ویراستاری، fact-check، تعیین همهٔ المان‌های محتوایی صفحه (H1/H2، intro، بدنه، proof، FAQ، CTA، microcopy، alt/caption، anchor)، audit محتوای قدیمی، به‌روزرسانی style guide.
- **خروجی:** Content Strategy، Editorial Calendar، Content Brief، Draft/Edited Copy، Page Content Model، FAQ/CTA، Content Audit، Playbook.
- **KPI:** organic engagement، conversion، freshness/accuracy، نرخ رد ویرایشی، velocity، سهم محتوای دارای منبع.
- **حق وتو:** لحن، کیفیت و صحت محتوایی.

### ۶.۴ SEO — مالک رشد ارگانیک

- **مأموریت:** رشد پایدار ارگانیک و حضور در جستجوی کلاسیک و AI.
- **مالکیت:** استراتژی SEO، معماری موضوعی، technical SEO، on-page، internal linking، external link building/digital PR، schema، index health، international SEO، AI search visibility.
- **مسئولیت مستمر:** رادار ساعتی/روزانهٔ اخبار و آپدیت‌ها، تحلیل impact، رصد رقبا و SERP، crawl/index monitoring، topic cluster، brief SEO، برنامهٔ لینک‌سازی و outreach، آزمایش و اندازه‌گیری.
- **خروجی:** SEO Strategy/Roadmap، Topic Cluster، Metadata/Schema Spec، Internal Link Plan، Backlink/Outreach Plan، Technical SEO Fix، Experiment Spec.
- **KPI:** organic clicks/impressions، rankings، index coverage، referring domains، CWV، AI citations، organic revenue.
- **حق وتو:** نیت جستجو، ساختار ارگانیک و indexability.

### ۶.۵ Design — مالک تجربه و کیفیت بصری

- **مأموریت:** تجربهٔ قابل‌اعتماد، خوانا، دسترس‌پذیر و متمایز.
- **مالکیت:** استراتژی UX، design system، art direction، تعامل، accessibility، responsive behavior، conversion design، research و prototyping.
- **مسئولیت مستمر:** journey mapping، user research، طراحی template/component، design token، visual QA، a11y audit، طراحی آزمایش، همکاری با Content در content design و با Dev در implementation.
- **خروجی:** UX Strategy، Design System، Wireframe/Prototype، Component Spec، A11y Report، Visual Regression Baseline، Experiment Design.
- **KPI:** task success، conversion، a11y compliance، design consistency، UX/CWV metrics.
- **حق وتو:** UX، accessibility و یکپارچگی طراحی.

### ۶.۶ Dev — مالک پلتفرم و قابلیت اطمینان

- **مأموریت:** پلتفرم امن، سریع، قابل‌نگهداری و قابل‌انتشار.
- **مالکیت:** معماری فنی، کیفیت کد، امنیت، performance، reliability، CI/CD، observability، API/data integration، infrastructure as code، testing strategy، tech debt، incident response.
- **مسئولیت مستمر:** نگهداری pipeline، feature flag، بهینه‌سازی، بازبینی امنیتی و dependency، runbook، تحقق نیازهای SEO/Design/Content در کد.
- **خروجی:** Code/API، Test Suite، Infra Change، Performance Fix، Technical Spec، Runbook، Postmortem.
- **KPI:** deploy frequency، lead time، change failure rate، MTTR، uptime، CWV، security findings، cost.
- **حق وتو:** امنیت، امکان‌پذیری فنی و یکپارچگی داده.

### ۶.۷ قراردادهای بین‌تیمی

| از | به | قرارداد |
|---|---|---|
| Content | SEO | topic cluster، brief، internal link، on-page |
| SEO | Content | نیت جستجو، شکاف موضوعی، الزامات metadata |
| Tour Manager | Content/SEO/Design | Fact Sheet، قیمت، ظرفیت، قوانین |
| Design | Dev | component spec، token، a11y، interaction |
| Dev | SEO/Design | implementation constraints، performance، preview |
| همه | Leader | بودجه، اولویت، تعارض |
| همه | Reviewer مستقل | evidence و تأیید نهایی |

**قواعد وتو:** وتو باید با evidence و rationale ثبت شود؛ وتوی تکراری بدون شاهد، خودش یک سیگنال کیفیت است.

---

## ۷. Runtime

### ۷.۱ Runtime اجرا (GitHub Actions)

- **GitHub Actions** بستر اجرا و زمان‌بندی است؛ بدون سرور orchestrator جدا (ADR-011).
- اجراکننده یک runner درون‌فرآیندی است: `site/lib/factory/runner.ts` با `runWorkItem` / `runSeoOps` / `runTourOps` / `runOutreach`.
- هر اجرا یک فرآیند کوتاه‌عمر است: اسکریپت محلی، CI یا job گیت‌هاب اکشنز.
- Retry سیاست‌محور: سه تلاش با backoff نمایی؛ خطای nonRetryable بدون دوباره.
- cadence دامنه‌ها با schedule همان workflowهای `.github/workflows`.
- وضعیت اجرا در Event Log و projectionها؛ rebuild همیشه از Event Log.

### ۷.۲ هم‌زمانی و صف

- صف توزیع‌شده حذف شده است؛ هر کار در همان فرآیندی که آن را شروع می‌کند اجرا می‌شود.
- سقف هم‌زمانی با محدودیت گیت‌هاب اکشنز و اجرای محلی مدیریت می‌شود.
- قفل منابع (بخش ۵.۴) همچنان در Event Log نگه داشته می‌شود.

### ۷.۳ اجراکننده‌ها

- Stateless و کوتاه‌عمر: همان runner در اسکریپت، CI یا job.
- هر دامنه قرارداد Task خودش را دارد؛ اجرا با budget و timeout همان WorkItem.
- اجراکننده‌ها artifact/evidence می‌نویسند و state از Event Log می‌آید.
- هیچ اجراکننده‌ای secret تولیدی یا دسترسی مستقیم به production ندارد.
- مسیر Release فقط مجوز dry-run دارد؛ promote/rollback انسانی می‌ماند.

### ۷.۴ Sandbox

- Container ephemeral با شبکهٔ محدود.
- بدون secret تولیدی؛ فقط token کوتاه‌عمر و read-only repo.
- اجرای build، typecheck، test، Playwright، Lighthouse، axe، crawl، scan.
- خروجی با hash و trace به WorkItem متصل می‌شود.
- محدودیت CPU/حافظه/زمان و پاک‌سازی خودکار.

### ۷.۵ قرارداد Activity

ورودی:

```json
{
  "work_item_id": "01J...",
  "task_id": "01J...",
  "role": "content",
  "attempt": 1,
  "deadline": "2026-10-20T14:00:00Z",
  "budget": { "tokens": 50000, "cost_usd": 2 },
  "policy_version": "policy-2026-10-20.1",
  "playbook_version": "content-2026-10-20.3",
  "idempotency_key": "wi:task:attempt",
  "inputs": {}
}
```

خروجی:

```json
{
  "status": "ok | rejected | needs_review | failed",
  "artifacts": ["artifact://sha256/..."],
  "evidence": ["evidence://sha256/..."],
  "confidence": 0.86,
  "cost": { "tokens": 12000, "usd": 0.41 },
  "reason": "...",
  "next_actions": ["..."]
}
```

- JSON Schema برای هر Task type.
- خروجی آزاد متنی کافی نیست.
- `needs_review` یک وضعیت رسمی است، نه شکست.
- Evidence و Artifact با hash و lineage ذخیره می‌شوند.

### ۷.۶ قابلیت اطمینان

- Retry سیاست‌محور: خطای موقت retry؛ رد policy/content غیرقابل retry.
- Timeout سه‌لایه: شروع، اجرا، heartbeat.
- کارهای طولانی به checkpointهای کوچک تقسیم می‌شوند.
- Outbox/Inbox برای اثرات جانبی.
- Circuit breaker برای providerها.
- Compensation برای اثرات جانبی نیمه‌کاره.
- قفل منابع با TTL و heartbeat.
- سقف هم‌زمانی per-role و per-resource.

### ۷.۷ مرز داده

- runner: وضعیت اجرای در جریان (retry و قفل‌ها).
- Postgres عملیاتی: projection/read model.
- Object Storage: artifactها.
- Event Log: audit و بازسازی.
- DB سایت: فقط دادهٔ محتوا/محصول؛ Factory به آن write مستقیم ندارد.
- Projector از Event Log تغذیه می‌شود؛ dual-write ممنوع.

### ۷.۸ امنیت

- GitHub App با دسترسی حداقلی و token کوتاه‌عمر.
- Secret Manager برای همهٔ secretها.
- Sandbox بدون secret تولیدی.
- Artifactها امضاشده.
- Audit log برای تصمیم، وتو، تأیید، انتشار و rollback.
- RBAC برای انسان‌ها؛ service identity برای agentها.
- هیچ secret یا PII در logها.

---

## ۸. کیفیت، Policy و Release

### ۸.۱ Quality Profile

هر WorkItem بر اساس نوع و ریسک یک profile می‌گیرد:

- `content`: صحت، استناد، لحن، ساختار، تکرار، SEO، لینک.
- `seo`: indexability، metadata، schema، internal links، crawl، CWV.
- `design`: visual regression، responsive، a11y، interaction.
- `code`: type/build، unit/integration/e2e، security، performance.
- `tour`: صحت داده، قیمت/حاشیه، ظرفیت، قوانین.
- `infra`: امنیت، migration، rollback، observability.

Profileها نسخه‌دارند و agent نمی‌تواند آن‌ها را دور بزند.

### ۸.۲ Gateها

| Gate | نمونه | Evidence |
|---|---|---|
| Static | typecheck، lint، build | CI output |
| Test | unit، integration، e2e، contract | test report |
| Content | استناد، fact-check، لحن، ساختار | claim map + sources |
| SEO | title/meta، canonical، robots، sitemap، schema | crawl report |
| Design | visual diff، breakpoints، a11y | screenshot + axe |
| Performance | CWV، bundle، latency، error rate | Lighthouse/RUM |
| Security | secret/dependency scan، authz، PII | scan report |
| Business | قیمت/حاشیه، ظرفیت، قوانین | rule engine |

- وضعیت: `pass / fail / warn / not_applicable`.
- بدون evidence، pass معتبر نیست.
- Gateها در Sandbox مستقل اجرا می‌شوند.
- نتیجه امضا و به WorkItem متصل می‌شود.
- Gate flaky قرنطینه می‌شود؛ retry نباید شکست را پنهان کند.

### ۸.۳ ماتریس ریسک

| ریسک | نمونه | مسیر |
|---|---|---|
| R0 | متن، FAQ، alt، microcopy | خودکار پس از content/SEO |
| R1 | metadata، internal link، UI token، layout | خودکار پس از SEO/design |
| R2 | کامپوننت، API غیرحیاتی، رفتار UI | خودکار در blast radius کم؛ وگرنه انسان |
| R3 | auth، payment، قیمت، DB schema، امنیت، infra | انسان + security review |
| R4 | حذف داده، تغییر برگشت‌ناپذیر، legal | انسان + rollout مرحله‌ای |

- ریسک ناشناخته = R4.
- Policy as Code (OPA/Rego یا Cedar).
- تغییر Policy فقط با تأیید انسان.
- هر تصمیم Policy با دلیل و evidence ثبت می‌شود.

### ۸.۴ جریان Release

```text
WorkItem
  → branch + immutable build
  → preview (noindex, isolated)
  → quality gates
  → policy decision
  → [human approval if required]
  → merge queue
  → production deploy
  → health + smoke + key-page verification
  → outcome measurement
```

- هر WorkItem preview مستقل دارد.
- Merge Queue نوشتن روی `main` را سریالی می‌کند.
- Release Packet شامل diff، preview، screenshot، evidence، ریسک، URLهای متأثر و rollback plan است.
- Timeout تأیید = blocked، نه انتشار خودکار.
- Rollback با artifact قبلی، feature flag یا revert.
- Migrationهای destructive فقط forward-fix دارند.
- Feature Flag برای تغییرات رفتاری R2+.

### ۸.۵ پس از انتشار

- Health check و smoke test فوری.
- خطای بحرانی → rollback خودکار.
- job اندازه‌گیری outcome در ۲۴ ساعت، ۷ روز و ۲۸ روز اثر را می‌سنجد.
- نتیجه به Domain Scorecard و Playbook برمی‌گردد.
- اثر منفی → follow-up یا rollback پیشنهادی.

---

## ۹. داشبورد، داده و Observability

### ۹.۱ داشبورد

داشبورد فقط Read + Control Surface است.

- **Portfolio Overview:** OKR، KPI، WorkItemهای فعال، ریسک، بودجه، blockedها.
- **Domain Workspace:** Playbook، Radar، backlog، KPI، آزمایش‌ها، ظرفیت.
- **WorkItem Detail:** DAG، وضعیت Task، Artifact/Evidence، هزینه، trace، Review/Veto.
- **Approval Inbox:** diff، preview، ریسک، شواهد، URLها، rollback plan.
- **Release Center:** تاریخچه، health، Outcome Window، rollback، incident.
- **Playbook & Knowledge:** نسخه، diff، مالک، بازبینی.
- **Ops & Cost:** صف اجرا، سلامت runner، خطای مدل/ابزار، بودجه.
- **Search & Audit:** جستجو بر اساس URL، تور، Signal، Decision، Release.

مدل فرمان:

- همهٔ اقدام‌ها با `idempotency_key`، مجوز نقش و Policy Check.
- تأیید انسان شامل hash شواهد.
- SSE/WebSocket برای به‌روزرسانی؛ polling به‌عنوان fallback.
- RBAC: `viewer`, `domain_owner`, `approver`, `admin`, `auditor`.
- Agentها از UI استفاده نمی‌کنند؛ service identity دارند.

### ۹.۲ مدل داده

| لایه | منبع حقیقت | نقش |
|---|---|---|
| وضعیت اجرا | Event Log + runner | وضعیت اجرا، retry، قفل منابع |
| Projection | Postgres عملیاتی | داشبورد، جستجو، گزارش |
| Artifact | Object Storage | patch، screenshot، build، trace |
| Audit | Event Log | تاریخچهٔ تغییرناپذیر |

جدول‌های اصلی:

- `signals`, `radar_items`
- `work_items`, `tasks`, `task_attempts`
- `artifacts`, `evidence`
- `decisions`, `reviews`, `vetoes`
- `releases`, `release_events`
- `outcomes`
- `domain_scorecards`
- `playbooks`, `playbook_versions`
- `policies`, `policy_versions`
- `budget_ledger`, `resource_locks`
- `model_calls`, `tool_calls`
- `audit_log`, `outbox`, `inbox`

`WorkItem` حداقل: `domain`, `owner_role`, `risk`, `playbook_version`, `policy_version`, `kpi_target`, `outcome_window`, `runner_execution_id`, `budget`, `spent`.
`Release` حداقل: `commit_sha`, `artifact_hash`, `evidence_bundle_hash`, `policy_decision_id`, `approved_by`, `rollback_of`.

Projectionها از Event Log بازسازی‌پذیرند.

### ۹.۳ Observability

سه لایه:

- **Technical:** نرخ اجرا، latency، خطای step، اشباع اجراکننده، سلامت مدل/ابزار.
- **Agent Quality:** نرخ pass Gate، hallucination، کیفیت استناد، نرخ وتو، دقت Playbook، Eval Suite.
- **Business:** organic traffic، conversion، margin، CWV، uptime، اثر Release.

- OpenTelemetry روی کل مسیر Signal → Outcome.
- متریک‌ها: workflow failure، queue lag، cost per outcome، approval SLA، lead time، change failure rate، MTTR.
- Eval Suite برای هر دامنه: golden dataset، regression، canary مدل.
- Cost Attribution به WorkItem/domain/model/tool.
- Anomaly Detection: حلقهٔ تکراری، هزینهٔ غیرعادی، retry زیاد، Gate flaky.
- Retention و redaction برای PII/secret.

### ۹.۴ SLOهای نمونه

- ۹۹٪ WorkItemهای R0/R1 بدون دخالت انسان و زیر بودجه.
- ۱۰۰٪ Releaseها دارای Evidence Bundle و Policy Decision.
- صفر انتشار خارج از Merge Queue.
- rollback زیر ۵ دقیقه.
- نرخ false positive Gate زیر آستانهٔ توافق‌شده.

---

## ۱۰. مهاجرت و Cutover

### ۱۰.۱ اصول

- Strangler، نه Big Bang.
- بدون Dual-Write؛ فقط Shadow Read.
- Cutover بر اساس capability.
- Git منبع حقیقت.
- وضعیت بد مهاجرت نمی‌شود؛ آرشیو می‌شود.
- سیستم قدیمی تا اثبات مسیر جدید warm می‌ماند.

### ۱۰.۲ تصمیم‌های وضعیت فعلی

- چرخهٔ `paused` از سر گرفته نمی‌شود؛ فقط رفع اضطراری.
- `dev` به‌عنوان شاخهٔ دائمی بازنشسته می‌شود؛ branch per WorkItem.
- صف deploy فریز می‌شود؛ آیتم‌های failed/dead پس از triage به WorkItem جدید تبدیل می‌شوند.
- پچ‌های `proposed`/`needs_review` آرشیو می‌شوند؛ merge خودکار ممنوع.
- GitHub Actions هم CI و هم runtime اجرا؛ زمان‌بندی با schedule همان workflowها.
- `PRISMA_SERVICE_TOKEN` و توکن‌های پهن‌دامنه با GitHub App جایگزین می‌شوند.
- Postgres عملیاتی جدا از DB سایت.

### ۱۰.۳ فازها

| فاز | هدف | معیار خروج |
|---|---|---|
| ۰. تثبیت | Backup، tag، baseline crawl/GSC، فریز تغییرات پرریسک | baseline ثبت‌شده و rollback مستند |
| ۱. زیرساخت | Postgres، Object Storage، Secret Manager، runner، OTEL، Control API، Projector | WorkItem آزمایشی بدون اثر production |
| ۲. Walking Skeleton | Content R0 end-to-end روی صفحهٔ کم‌ریسک | ۳ WorkItem موفق، صفر نوشتن مستقیم، rollback تست‌شده |
| ۳. SEO + Tour Facts | Radar، GSC، schema، internal links، قرارداد داده تور | R1 خودکار با evidence |
| ۴. Design + Dev | Design gates، visual regression، a11y، CI/e2e، R2 | یک تغییر R2 با rollout/rollback |
| ۵. Leader + Domain Ops | Portfolio، بودجه، Scorecard، داوری | تصمیم پورتفوی قابل ردیابی |
| ۶. Cutover | تغییر مسیر release؛ مسیر قدیمی read-only | چند Release واقعی بدون regression |
| ۷. Decommission | حذف worker/queue قدیمی، ابطال token، آرشیو | سیستم قدیمی خاموش |

### ۱۰.۴ Cutover Gate

- ۱۰ WorkItem R0/R1 با صفر نوشتن مستقیم.
- Evidence کامل و policy decision برای همه.
- Rollback واقعی تست‌شده.
- SEO baseline بدون regression.
- Cost per WorkItem در بودجه.
- Incident drill موفق.
- `FACTORY_RUNTIME=old|new` آماده و تست‌شده.

### ۱۰.۵ Rollback

- توقف release و برگشت flag.
- rollback به artifact قبلی.
- reconciliation projection.
- WorkItemهای در جریان قبل از cutover تخلیه/لغو می‌شوند.
- migrationها idempotent و dry-run دارند.

---

## ۱۱. تصمیم‌های معماری (ADR)

| ID | تصمیم | وضعیت |
|---|---|---|
| ADR-001 | Temporal Cloud به‌عنوان control plane | جایگزین‌شده با ADR-011 |
| ADR-002 | WorkItem واحد اجرا؛ حذف Cycle و قفل جهانی | تأییدشده |
| ADR-003 | Git منبع حقیقت سایت | تأییدشده |
| ADR-004 | ممنوعیت نوشتن مستقیم روی production | تأییدشده |
| ADR-005 | تأیید انتشار ریسک‌محور | تأییدشده |
| ADR-006 | شش دامنهٔ مالک‌محور + Leader | تأییدشده |
| ADR-007 | دو حلقهٔ Domain Ops و WorkItem Execution | تأییدشده |
| ADR-008 | Postgres عملیاتی جدا از DB سایت | تأییدشده |
| ADR-009 | Model/Tool Gateway انتزاعی | تأییدشده |
| ADR-010 | Evidence-first و maker-checker | تأییدشده |
| ADR-011 | GitHub Actions به‌عنوان runtime اجرا؛ runner درون‌فرآیندی جای Temporal | تأییدشده (۲۰۲۶-۱۰-۲۴) |

---

## ۱۲. تعریف «انجام‌شده»

یک تغییر فقط وقتی `done` است که:

1. WorkItem و Taskها به وضعیت نهایی رسیده باشند.
2. Evidence Bundle کامل و امضاشده باشد.
3. Policy Decision ثبت شده باشد.
4. Release در production سالم باشد.
5. Outcome Window اولیه ثبت شده باشد.
6. Audit trail کامل باشد.
7. هیچ قفل یا بودجهٔ معلقی باقی نمانده باشد.
