/**
 * lib/teams/design.ts : تیم طراحی (design) تایلندگرد
 *
 * این تیم دیگر «توضیح دربارهٔ طراحی» نمی‌دهد؛ کامپوننت واقعی React/TSX تولید
 * می‌کند که مستقیم روی ریپوی سایت قابل اعمال است.
 *
 * سه فراخوانی LLM هر چرخه: سرپرست ← مجری (تولید کد) ← منتقد (داوری کد).
 * خروجی نهایی: PatchFile[] با مسیر site/components/... که تیم dev یا مرحلهٔ
 * اعمال، آن را با applyPatchViaGithub روی شاخهٔ dev ریپوی سایت کامیت می‌کند.
 *
 * قوانین سفت (دستور مسعود):
 * - فقط آیتم‌های رجیستری وایب‌فارسی؛ استایل من‌درآوردی ممنوع.
 * - راست‌چین با خاصیت‌های منطقی (ms/me/ps/pe/text-start/...)؛ هرگز ml/mr/pl/pr/text-left.
 * - تیتر با Pinar FD، بدنه با IranSans X، ارقام فارسی در متن نمایشی.
 * - U+2014 مطلقاً ممنوع.
 * - تم Graphite: خط مویی ۱px، بدون سایه، گوشهٔ ۸/۲۲، حرکت ۲۰۰ms.
 */

import { callLLM, callLLMJson } from '../llm';
import { buildKnowledgePromptSection } from '../rag';
import { extractCriticKnowledge, criticKnowledgeLog } from '../knowledge/critic-knowledge';
import type {
  ProgressReporter,
  MemoryEntry,
  QueuedTask,
  TeamName,
  TeamResult,
  PatchFile,
} from '../types';

export const TEAM: TeamName = 'design';

export const MISSION =
  'از بریف artdir کامپوننت واقعی React/TSX می‌سازد؛ هر چرخه دقیقاً یک کامپوننت قابل‌مشاهده با الگوهای رجیستری وایب‌فارسی، راست‌چین درست و تایپوگرافی فارسی، آمادهٔ کامیت روی شاخهٔ dev.';

export interface TeamInput {
  /** گزارش زنده‌ی پیشرفت به ارکستر؛ ارکستر همیشه آن را می‌دهد. */
  reportProgress?: ProgressReporter;
  cycleId: string;
  runId: string;
  ragContext: string;
  memory: MemoryEntry[];
  previousWavesOutput: Record<string, TeamResult | null>;
}

/** تصمیم سرپرست: دقیقاً یک کامپوننت برای این چرخه. */
interface SupervisorPlan {
  component: {
    /** نام فارسی کامپوننت، مثل «کارت تور». */
    name: string;
    /** مسیر فایل در ریپوی سایت، مثل site/components/tours/tour-card.tsx */
    filePath: string;
    /** نام تابع exportشده، مثل TourCard */
    exportName: string;
    /** یک جمله: این کامپوننت کجای سایت می‌نشیند و چه کاری می‌کند. */
    purpose: string;
    /** slug آیتم‌های رجیستری وایب‌فارسی که الگو هستند، مثل ["card", "badge"]. */
    registryRefs: string[];
    /** پراپ‌های ورودی کامپوننت به زبان ساده. */
    props: string;
  };
}

/** خروجی مجری: فایل‌های واقعی. */
interface WorkerOutput {
  files: PatchFile[];
}

/** حکم منتقد روی کد واقعی. */
interface CriticVerdict {
  approved: boolean;
  reason: string;
  /** کد نهایی تأییدشده یا اصلاح‌شده؛ در صورت رد می‌تواند تهی باشد. */
  files: PatchFile[];
}

/** قوانین سفت تولید کد که به مجری و منتقد داده می‌شود. */
const CODE_RULES = [
  '۱. راست‌چین فقط با خاصیت‌های منطقی: ms-، me-، ps-، pe-، text-start، text-end، start-0، end-0، rounded-s-، rounded-e-، border-s، border-e.',
  '۲. ممنوع مطلق: ml-، mr-، pl-، pr-، text-left، text-right، left-0، right-0، rounded-l-، rounded-r-، space-x- (به‌جایش gap).',
  '۳. تیتر با فونت Pinar FD و بدنه با IranSans X (کلاس‌های font-pinar و font-iransans اگر در تم تعریف شده‌اند؛ وگرنه font-bold برای تیتر).',
  '۴. هر عددی که کاربر می‌بیند باید فارسی باشد (۱۲٬۵۰۰٬۰۰۰ تومان، نه 12500000).',
  '۵. کاراکتر U+2014 (خط تیرهٔ بلند) مطلقاً ممنوع؛ به‌جایش «:» یا «،» یا «ـ».',
  '۶. تم Graphite: حاشیهٔ مویی ۱px با border، بدون سایه (shadow-* ممنوع)، گوشه‌های rounded-lg یا rounded-[22px]، حرکت transition با duration-200.',
  '۷. فقط توکن‌های تم: bg-background، text-foreground، text-muted-foreground، border، bg-muted و لهجهٔ کهربایی برای تأکید کوچک. رنگ hex من‌درآوردی (text-[#...] و bg-[#...]) ممنوع.',
  '۸. آیکون فقط از lucide-react؛ در راست‌چین، آیکون «بعدی/جلو» ArrowLeft است نه ArrowRight.',
  '۹. کامپوننت باید export تابع نام‌دار با interface پراپ‌ها باشد؛ بدون ' + "'use client'" + ' مگر تعامل واقعی (useState/useEffect) لازم باشد.',
  '۱۰. TSX معتبر: تگ‌های متوازن، ایمپورت‌های استفاده‌شده، تایپ TypeScript درست. بدون کد نمایشی یا TODO.',
].join('\n');

/** سرپرست: از بریف artdir و خروجی branding دقیقاً یک کامپوننت انتخاب می‌کند. */
async function runSupervisor(input: TeamInput): Promise<SupervisorPlan> {
  let knowledgeSection = '';
  try {
    knowledgeSection = await buildKnowledgePromptSection(TEAM, MISSION);
  } catch {
    knowledgeSection = '';
  }
  const memoryLines = input.memory.map((m) => `- ${m.key}: ${m.value}`).join('\n');
  const artdirResult = input.previousWavesOutput['artdir'];
  const brandingResult = input.previousWavesOutput['branding'];
  const artdirBrief = artdirResult?.summary ?? '(بریف artdir نیست)';
  const brandingOutput = brandingResult?.summary ?? '(خروجی branding نیست)';
  const prompt = [
    'زمینه:',
    ...(knowledgeSection ? [knowledgeSection, ''] : []),
    input.ragContext || '(زمینه‌ای نیست)',
    '',
    'بریف آرت‌دایرکشن (خروجی تیم artdir):',
    artdirBrief,
    '',
    'خروجی تیم branding:',
    brandingOutput,
    '',
    memoryLines ? `یادگیری‌های قبلی:\n${memoryLines}` : '',
    '',
    `مأموریت تیم design: ${MISSION}`,
    '',
    'دقیقاً یک کامپوننت انتخاب کن که این چرخه ساخته شود: کوچک، مشخص و قابل‌مشاهده روی سایت (مثل کارت تور، بنر، بخش نظرات، دکمهٔ تماس). از تکرار کامپوننت‌های یادگیری‌های قبلی پرهیز کن.',
    'فقط JSON معتبر بده با کلید component شامل: name (فارسی)، filePath (با الگوی site/components/<area>/<kebab-name>.tsx)، exportName (PascalCase)، purpose (یک جمله)، registryRefs (آرایهٔ slug آیتم‌های رجیستری وایب‌فارسی)، props (توصیف پراپ‌ها).',
  ]
    .filter((l) => l !== null)
    .join('\n');
  return callLLMJson<SupervisorPlan>(prompt, {
    system: 'تو سرپرست تیم design تایلندگرد هستی. فقط JSON معتبر می‌دهی؛ بدون حدس.',
    temperature: 0.3,
  });
}

/** مجری: کامپوننت واقعی TSX تولید می‌کند. */
async function runWorker(plan: SupervisorPlan): Promise<WorkerOutput> {
  const c = plan.component;
  const prompt = [
    `کامپوننت «${c.name}» را بساز.`,
    `مسیر فایل: ${c.filePath}`,
    `نام export: ${c.exportName}`,
    `کاربرد: ${c.purpose}`,
    `الگوهای رجیستری وایب‌فارسی: ${c.registryRefs.join('، ') || '(مشخص نشده)'}`,
    `پراپ‌ها: ${c.props}`,
    '',
    'قوانین سفت تولید کد:',
    CODE_RULES,
    '',
    'فقط JSON معتبر بده با کلید files شامل آرایه‌ای از {path، content}؛ content باید کل محتوای فایل TSX باشد. بدون توضیح اضافه، بدون markdown.',
  ].join('\n');
  return callLLMJson<WorkerOutput>(prompt, {
    system:
      'تو مجری تیم design تایلندگرد هستی؛ یک برنامه‌نویس فرانت‌اند حرفه‌ای فارسی‌زبان. فقط JSON معتبر با کد واقعی می‌دهی؛ هیچ توضیحی دربارهٔ طراحی نمی‌نویسی، فقط کد.',
    temperature: 0.5,
    maxTokens: 6000,
  });
}

/**
 * منتقد: کد واقعی را می‌خواند و داوری می‌کند.
 * رد شدن یعنی کد مشکل دارد و نباید کامیت شود؛ نه اینکه تیم کار نکرده.
 */
async function runCritic(files: PatchFile[]): Promise<CriticVerdict> {
  const prompt = [
    'کدهای تولیدشده توسط مجری:',
    ...files.map((f) => `--- ${f.path} ---\n${f.content}`),
    '',
    'قوانین سفت:',
    CODE_RULES,
    '',
    'کد را خط‌به‌خط داوری کن:',
    'الف) TSX معتبر است؟ (تگ متوازن، export درست، interface پراپ‌ها، ایمپورت‌های استفاده‌شده)',
    'ب) راست‌چین درست است؟ (فقط خاصیت منطقی؛ هیچ ml/mr/pl/pr/text-left نباشد)',
    'پ) تایپوگرافی فارسی درست است؟ (فونت تیتر و بدنه، ارقام فارسی در متن نمایشی)',
    'ت) U+2014 در کد یا متن نیست؟',
    'ث) فقط توکن‌های تم وایب‌فارسی/گرافیت به کار رفته؟ (بدون hex من‌درآوردی، بدون سایه)',
    'اگر ایراد کوچکی هست، خودت در files اصلاحش کن و approved بده. فقط اگر ایراد ساختاری جدی است رد کن.',
    'فقط JSON معتبر بده با کلیدهای: approved (بولین)، reason (یک جملهٔ فارسی)، files (آرایهٔ {path، content} نهایی؛ در صورت رد می‌تواند تهی باشد).',
  ].join('\n');
  return callLLMJson<CriticVerdict>(prompt, {
    system:
      'تو منتقد سخت‌گیر کد تیم design هستی. کد واقعی را داوری می‌کنی نه توضیح را. فقط JSON معتبر می‌دهی.',
    temperature: 0.2,
    maxTokens: 6000,
  });
}

/** یادگیری چرخه در حافظه؛ اگر ماژول حافظه هنوز ساخته نشده باشد، بی‌صدا رد می‌شود. */
async function remember(runId: string, lesson: string): Promise<void> {
  try {
    const mod = (await import('../memory')) as {
      writeMemory?: (team: TeamName, key: string, value: string) => Promise<unknown>;
    };
    await mod.writeMemory?.(TEAM, `learned:${runId}`, lesson);
  } catch {
    // ماژول حافظه هنوز در این ریپو ساخته نشده؛ چیزی گم نمی‌شود.
  }
}

/** اعتبارسنجی سبک PatchFile پیش از تحویل. */
function validatePatches(files: PatchFile[]): string | null {
  if (!Array.isArray(files) || files.length === 0) return 'فایل تولید نشد';
  if (files.length > 5) return 'بیش از ۵ فایل در یک چرخه مجاز نیست';
  for (const f of files) {
    if (typeof f.path !== 'string' || !f.path.trim()) return 'مسیر یک فایل نامعتبر است';
    const p = f.path.trim().replace(/^\/+/, '');
    if (p.includes('..') || p.startsWith('.git') || p.includes('.env'))
      return `مسیر غیرمجاز: ${p}`;
    if (!p.startsWith('site/')) return `مسیر باید با site/ شروع شود: ${p}`;
    if (typeof f.content !== 'string' || f.content.trim().length < 50)
      return `محتوای فایل ${p} خیلی کوتاه است`;
    if (f.content.includes('\u2014')) return `U+2014 در فایل ${p} دیده شد`;
  }
  return null;
}

export async function runTeam(input: TeamInput): Promise<TeamResult> {
  const reportLive = input.reportProgress;
  await reportLive?.('سرپرست: انتخاب کامپوننت این چرخه', 15);
  const plan = await runSupervisor(input);

  await reportLive?.(`مجری: تولید کد ${plan.component.name}`, 50);
  const workerOut = await runWorker(plan);

  await reportLive?.('منتقد: داوری کد واقعی', 80);
  const localError = validatePatches(workerOut.files);
  const verdict: CriticVerdict = localError
    ? { approved: false, reason: localError, files: [] }
    : await runCritic(workerOut.files);

  const tasks: QueuedTask[] = [];
  const blockers: string[] = [];
  // PatchFileها برای مرحلهٔ اعمال (تیم dev یا job اعمال) روی همین نتیجه سوار می‌شوند.
  let patches: PatchFile[] | undefined;

  if (!verdict.approved) {
    blockers.push(`منتقد design کد را تأیید نکرد: ${verdict.reason}`);
  } else {
    const patchError = validatePatches(verdict.files);
    if (patchError) {
      blockers.push(`خروجی نهایی منتقد نامعتبر است: ${patchError}`);
    } else {
      patches = verdict.files.map((f) => ({
        path: f.path.trim().replace(/^\/+/, ''),
        content: f.content,
      }));
      tasks.push(
        {
          title: `اعمال کامپوننت ${plan.component.name} روی سایت`,
          description: `کامپوننت ${plan.component.exportName} در ${patches.map((p) => p.path).join('، ')} آمادهٔ کامیت روی شاخهٔ dev ریپوی سایت است (الگوهای رجیستری: ${plan.component.registryRefs.join('، ') || 'ندارد'}).`,
          files_hint: patches.map((p) => p.path).join(', '),
          priority: 'high',
        },
        {
          title: 'بازبینی سه‌چشمی کد نهایی',
          description: `کد ${plan.component.name} از نظر فارسی‌نویسی، راست‌چین و توکن‌های وایب‌فارسی توسط منتقد تأیید شد و برای ممیزی vibefarsi و farsiui آماده است.`,
          files_hint: 'design-system/decisions.md',
          priority: 'medium',
        },
      );
    }
  }

  const approved = patches !== undefined;
  const lesson = approved
    ? `کامپوننت موفق: ${plan.component.name} (${plan.component.filePath})`
    : `رد منتقد: ${verdict.reason}`;
  await remember(input.runId, lesson);

  // استخراج دانش حرفه‌ای از حکم منتقد و ایندکس در RAG
  const knowledgeResult = await extractCriticKnowledge(
    TEAM,
    { approved, reason: approved ? `کامپوننت ${plan.component.name} تأیید شد` : verdict.reason, domain: 'تولید کامپوننت' },
    input.runId,
  );
  const knowledgeLog = criticKnowledgeLog(knowledgeResult);

  const summary = approved
    ? `تیم design این چرخه کامپوننت «${plan.component.name}» را به‌صورت کد واقعی TSX تولید کرد (${patches!.map((p) => p.path).join('، ')})؛ منتقد کد را از نظر راست‌چین، تایپوگرافی فارسی و توکن‌های وایب‌فارسی تأیید کرد. ${knowledgeLog}`
    : `تیم design این چرخه کد تولید کرد ولی منتقد آن را تأیید نکرد و کار به چرخهٔ بعد موکول شد. دلیل: ${verdict.reason} ${knowledgeLog}`;

  return {
    team: TEAM,
    summary,
    blockers,
    tasks: tasks.slice(0, 3),
    approved,
    patches,
  };
}
