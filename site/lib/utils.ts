import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatToman(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان";
}

export function formatBaht(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " بات";
}

export function convertAndFormatPrice(amount: number, currency: 'THB' | 'IRT', rate: number = 1850): string {
  if (currency === 'THB') {
    const tomanAmount = amount * rate;
    return `${formatBaht(amount)} (حدود ${formatToman(tomanAmount)})`;
  } else {
    return formatToman(amount);
  }
}
