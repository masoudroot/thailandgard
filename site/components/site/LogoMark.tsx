/**
 * نشانهٔ موقت تایلندگرد (۲۴ مهر ۱۴۰۵).
 * لوگوی نهایی بعداً می‌آید؛ این نشانهٔ موقت از سند برند ۱.۰ بیرون کشیده شد:
 * «مسیر به نقطهٔ مقصد»؛ یک خط مسیر (کرم) که به یک پین مقصد می‌رسد،
 * با نقطهٔ طلایی در مرکز پین. ساده، تمیز، در اندازهٔ کوچک هم خوانا.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect width="40" height="40" rx="11" fill="#104C46" />
      <path
        d="M8.5 29.5 C13.5 26 16.5 23.5 16.5 19"
        stroke="#F6F2E8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="13" r="5.5" stroke="#F6F2E8" strokeWidth="3" />
      <circle cx="16.5" cy="13" r="2" fill="#C49A4A" />
    </svg>
  );
}
