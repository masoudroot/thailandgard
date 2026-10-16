import type { TeamName } from './types';

/** نام فارسی و مأموریت یک‌خطی هر ۵ تیم؛ منبع مشترک صفحه‌های تیم‌ها. */
export const TEAM_META: Record<TeamName, { faName: string; mission: string }> = {
  leader: { faName: 'رهبر', mission: 'بک‌لاگ، تخصیص تسک و مدیریت یادگیری تیم‌ها' },
  content: { faName: 'محتوا', mission: 'مقاله، راهنما و متن‌های فارسی تخصصی سفر' },
  seo: { faName: 'سئو', mission: 'بهینه‌سازی فنی و ساختار برای گوگل' },
  design: { faName: 'دیزاین', mission: 'چیدمان، ظاهر و تجربه صفحه‌ها' },
  dev: { faName: 'توسعه', mission: 'پیاده‌سازی فنی، فیچر و کد تمیز' },
};

/** عنوان فارسی موج‌ها. */
export const WAVE_TITLES: Record<number, string> = {
  1: 'موج ۱',
  2: 'موج ۲',
  3: 'موج ۳',
};
