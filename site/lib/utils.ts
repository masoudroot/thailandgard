import { twMerge } from "tailwind-merge";

export type ClassValue = string | number | bigint | null | undefined | false | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const push = (i: ClassValue): void => {
    if (!i) return;
    if (Array.isArray(i)) {
      for (const n of i) push(n);
    } else {
      out.push(String(i));
    }
  };
  for (const i of inputs) push(i);
  return twMerge(out.join(" "));
}

export function formatPrice(amount: number, currency: 'IRR' | 'TOMAN' | 'THB' = 'TOMAN'): string {
  if (isNaN(amount)) return '۰';
  
  let formatted = '';
  
  switch (currency) {
    case 'THB':
      formatted = `${amount.toLocaleString('en-US')} بات`;
      break;
    case 'IRR':
      formatted = `${amount.toLocaleString('en-US')} ریال`;
      break;
    case 'TOMAN':
    default:
      formatted = `${amount.toLocaleString('en-US')} تومان`;
      break;
  }

  return toPersianNumbers(formatted);
}

export function toPersianNumbers(str: string | number): string {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.toString().replace(/\d/g, (match) => persianDigits[parseInt(match, 10)]);
}

export function toEnglishNumbers(str: string): string {
  if (!str) return '';
  const persianDigits: { [key: string]: string } = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };
  return str.replace(/[۰-۹]/g, (match) => persianDigits[match] || match);
}

export function formatDate(dateString: string, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const formatter = new Intl.DateTimeFormat('fa-IR', options);
    return formatter.format(date);
  } catch (e) {
    return dateString;
  }
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Convert Latin digits in a string/number to Persian digits: 1405 -> ۱۴۰۵ */
export function fa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** Persian digits back to Latin (for parsing user input). */
export function en(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** Thousands-separated Persian number: 12450000 -> ۱۲٬۴۵۰٬۰۰۰ */
export function faNumber(value: number): string {
  return fa(Math.round(value).toLocaleString("en-US")).replace(/,/g, "٬");
}

/** Percent with Persian digits and the Persian percent sign: 18 -> ۱۸٪ */
export function faPercent(value: number, digits = 0): string {
  return `${fa(value.toFixed(digits))}٪`;
}
