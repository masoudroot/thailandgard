"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * آیا کامپوننت در کلاینت hydration شده است؟
 *
 * جانشین الگوی `useState(null)` + `setState` داخل `useEffect` که قاعده
 * `react-hooks/set-state-in-effect` را نقض می کند. در رندر سرور و اولین رندر
 * کلاینت مقدار `false` است و بلافاصله بعد از hydration `true` می شود؛ چون
 * React در hydration از snapshot سرور استفاده می کند، ناهمخوانی hydration
 * رخ نمی دهد.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}