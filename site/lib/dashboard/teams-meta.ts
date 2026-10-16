/** نام فارسی و مأموریت یک‌خطی ۵ تیم (مشترک بین صفحه‌های داشبورد). */
import type { TeamName } from './types';

export const TEAM_META: Record<TeamName, { faName: string; mission: string }> = {
  leader: { faName: 'رهبر', mission: 'بک‌لاگ، تخصیص تسک و مدیریت یادگیری تیم‌ها' },
  content: { faName: 'محتوا', mission: 'مقاله، راهنما و متن‌های فارسی تخصصی سفر' },
  seo: { faName: 'سئو', mission: 'بهینه‌سازی فنی و ساختار برای گوگل' },
  design: { faName: 'دیزاین', mission: 'چیدمان، ظاهر و تجربه صفحه‌ها' },
  dev: { faName: 'توسعه', mission: 'پیاده‌سازی فنی، فیچر و کد تمیز' },
};

export function teamFaName(team: TeamName): string {
  return TEAM_META[team]?.faName ?? team;
}
