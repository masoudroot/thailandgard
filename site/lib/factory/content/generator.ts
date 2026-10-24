import {
  ContentDraftSchema,
  type ContentBrief,
  type ContentDraft,
} from './contracts';

export interface ContentGenerator {
  generate(brief: ContentBrief): ContentDraft;
}

const DEFAULT_LINKS = [
  { label: 'راهنمای مقاصد تایلند', href: '/destinations' },
  { label: 'تورهای فعال تایلند', href: '/tours' },
];

function countWords(markdown: string): number {
  return markdown
    .replace(/[#>*_`-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildBody(brief: ContentBrief): string {
  const facts = brief.sourceFacts
    .map((fact) => `- ${fact.claim} (منبع: ${fact.source})`)
    .join('\n');

  return `# ${brief.title}

${brief.targetKeyword} یکی از موضوعاتی است که ${brief.audience} پیش از تصمیم‌گیری باید دربارهٔ آن اطلاعات دقیق داشته باشد. این راهنما با تمرکز بر ${brief.targetKeyword} تلاش می‌کند تصویری روشن، کاربردی و بدون اغراق ارائه دهد.

## چرا ${brief.targetKeyword} مهم است

انتخاب زمان مناسب، شناخت هزینه‌ها و توجه به جزئیات محلی می‌تواند تجربهٔ سفر را به‌طور محسوسی بهتر کند. ${brief.audience} معمولاً به دنبال پاسخ روشن برای سه پرسش است: چه زمانی برود، چه چیزی را از قبل آماده کند و از چه اشتباهاتی پرهیز کند. این بخش تلاش می‌کند به همین پرسش‌ها پاسخ دهد.

## نکات کلیدی

${facts}

بررسی منابع رسمی و به‌روز نگه‌داشتن اطلاعات، بخشی جدایی‌ناپذیر از یک برنامهٔ خوب است. بهتر است پیش از رزرو نهایی، شرایط لغو، پوشش بیمه و محدودیت‌های فصلی را دوباره کنترل کنید.

## برنامهٔ پیشنهادی

یک برنامهٔ متعادل باید زمان استراحت، بازدید از جاذبه‌ها و فرصت تجربهٔ غذاهای محلی را کنار هم ببیند. شروع روز با فعالیت‌های اصلی و نگه‌داشتن عصر برای گشت‌وگذار سبک‌تر، خستگی را کم می‌کند. اگر همراه کودک یا سالمند سفر می‌کنید، فاصله‌های انتقال را کوتاه‌تر و زمان استراحت را بیشتر در نظر بگیرید.

## اشتباهات رایج

عجله در رزرو، اعتماد به اطلاعات قدیمی و نادیده گرفتن تفاوت‌های فصلی سه اشتباه پرتکرارند. همچنین بهتر است فقط به منابعی تکیه کنید که تاریخ به‌روزرسانی مشخص دارند. مقایسهٔ چند منبع مستقل، احتمال تصمیم نادرست را کاهش می‌دهد.

## پرسش‌های متداول

### بهترین زمان برای ${brief.targetKeyword} چه موقع است؟
بهترین زمان به سلیقه، بودجه و تحمل آب‌وهوا بستگی دارد. پیش از انتخاب، پیش‌بینی هوا و تقویم رویدادهای محلی را بررسی کنید.

### برای ${brief.targetKeyword} چه چیزی را از قبل آماده کنیم؟
مدارک، بیمه، بودجهٔ اضطراری و برنامهٔ ارتباطی را از قبل مشخص کنید. فهرست کوچکی از شماره‌های ضروری و آدرس اقامتگاه هم مفید است.

### آیا ${brief.targetKeyword} برای سفر خانوادگی مناسب است؟
بله، اما برنامه باید با سن و نیاز اعضای خانواده هماهنگ شود. زمان‌بندی سبک‌تر و گزینه‌های انعطاف‌پذیر، تجربه را راحت‌تر می‌کند.

${brief.cta}
`;
}

export class DeterministicContentGenerator implements ContentGenerator {
  generate(brief: ContentBrief): ContentDraft {
    const bodyMarkdown = buildBody(brief);
    const faq = [
      {
        question: `بهترین زمان برای ${brief.targetKeyword} چه موقع است؟`,
        answer:
          'بهترین زمان به سلیقه، بودجه و تحمل آب‌وهوا بستگی دارد. پیش از انتخاب، پیش‌بینی هوا و تقویم رویدادهای محلی را بررسی کنید.',
      },
      {
        question: `برای ${brief.targetKeyword} چه چیزی را از قبل آماده کنیم؟`,
        answer:
          'مدارک، بیمه، بودجهٔ اضطراری و برنامهٔ ارتباطی را از قبل مشخص کنید. فهرست کوچکی از شماره‌های ضروری و آدرس اقامتگاه هم مفید است.',
      },
      {
        question: `آیا ${brief.targetKeyword} برای سفر خانوادگی مناسب است؟`,
        answer:
          'بله، اما برنامه باید با سن و نیاز اعضای خانواده هماهنگ شود. زمان‌بندی سبک‌تر و گزینه‌های انعطاف‌پذیر، تجربه را راحت‌تر می‌کند.',
      },
    ];

    return ContentDraftSchema.parse({
      brief,
      title: brief.title,
      slug: brief.slug,
      metaDescription: `راهنمای کاربردی ${brief.targetKeyword} برای ${brief.audience}؛ نکات کلیدی، برنامهٔ پیشنهادی، اشتباهات رایج و پاسخ پرسش‌های متداول.`,
      bodyMarkdown,
      faq,
      internalLinks: DEFAULT_LINKS,
      cta: brief.cta,
      claims: brief.sourceFacts,
      wordCount: countWords(bodyMarkdown),
    });
  }
}
