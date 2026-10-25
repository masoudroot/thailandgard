"use client";

import { useSyncExternalStore } from "react";

/**
 * دیده‌شدن نوار چسبان بر اساس عبور از یک نگهبان در صفحه.
 *
 * جانشین الگوی `useState(false)` + `setState` داخل `useEffect` (که قاعده
 * `react-hooks/set-state-in-effect` را نقض می کند). وضعیت در یک store کوچک
 * بیرون از React نگه داشته می شود و `IntersectionObserver` آن را به‌روز
 * می کند؛ مقدار اولیه در سرور و کلاینت `false` است (نوار پنهان)، پس
 * ناهمخوانی hydration رخ نمی دهد.
 */
type Listener = () => void;

interface PastHeroStore {
  value: boolean;
  listeners: Set<Listener>;
  observer: IntersectionObserver | null;
}

const stores = new Map<string, PastHeroStore>();

function storeFor(sentinelId: string): PastHeroStore {
  let store = stores.get(sentinelId);
  if (!store) {
    store = { value: false, listeners: new Set(), observer: null };
    stores.set(sentinelId, store);
  }
  return store;
}

function setValue(store: PastHeroStore, value: boolean): void {
  if (store.value === value) return;
  store.value = value;
  for (const listener of store.listeners) listener();
}

function attach(sentinelId: string, store: PastHeroStore): void {
  if (store.observer) return;
  const sentinel = document.getElementById(sentinelId);
  if (!sentinel) {
    // بدون نگهبان: نوار از ابتدا دیده شود (رفتار قبلی همین بود).
    setValue(store, true);
    return;
  }
  store.observer = new IntersectionObserver(
    ([entry]) => setValue(store, !entry.isIntersecting && entry.boundingClientRect.top < 0),
    { threshold: 0 },
  );
  store.observer.observe(sentinel);
}

function detach(store: PastHeroStore): void {
  if (store.listeners.size > 0 || !store.observer) return;
  store.observer.disconnect();
  store.observer = null;
}

/**
 * @param sentinelId شناسه عنصری که با عبور از آن نوار ظاهر می شود
 *   (مثلاً `tour-hero-end` یا `october-hero-end`).
 */
export function usePastHero(sentinelId: string): boolean {
  const store = storeFor(sentinelId);
  return useSyncExternalStore(
    (onChange) => {
      store.listeners.add(onChange);
      attach(sentinelId, store);
      return () => {
        store.listeners.delete(onChange);
        detach(store);
      };
    },
    () => store.value,
    () => false,
  );
}