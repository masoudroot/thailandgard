-- 005: ستون source برای ردیاب تماس (یافتهٔ ۳۶ تیم تحلیل).
-- کلیک‌های tel: از این پس «کانال|صفحه|کمپین» را هم حمل می‌کنند (SOURCE-TRACKING.md).
-- افزایشی و idempotent: ستون nullable است و کد قدیم/جدید هر دو کار می‌کنند.

alter table public.call_clicks
  add column if not exists source text;

comment on column public.call_clicks.source is
  'سه‌بخشی «کانال|صفحه|کمپین» از buildSource (هندآف یافتهٔ ۳۶ تحلیل، ۲۰ مهر ۱۴۰۵)';
