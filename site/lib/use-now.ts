"use client";

import { useSyncExternalStore } from "react";

/**
 * زمان فعلی کلاینت به‌صورت یک store بیرونی، با ضربان هر ۶۰ ثانیه.
 *
 * چرا store و نه `useState` + `setState` در `useEffect`؟ قاعده‌های React
 * Compiler هم `setState` داخل افکت را رد می کنند و هم فراخوانی تابع ناخالص
 * (`Date.now()`) داخل رندر را. `useSyncExternalStore` هر دو را رفع می کند:
 * مقدار در سرور و اولین رندر کلاینت `null` است و بعد از subscribe تازه
 * می شود، پس hydration نمی شکند.
 */
const listeners = new Set<() => void>();
let current: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function tick(): void {
  current = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  const first = listeners.size === 0;
  listeners.add(listener);
  if (first) {
    tick();
    timer = setInterval(tick, 60_000);
  } else {
    // مشترک تازه باید همین حالا مقدار جاری را بگیرد.
    listener();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      current = null;
    }
  };
}

/** `null` پیش از hydration؛ بعد از آن زمان فعلی به میلی‌ثانیه. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}