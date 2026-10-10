/**
 * ذخیره‌سازی درخواست‌های تماس.
 *
 * قرارداد: هر پیاده‌سازی باید یک متد `save` داشته باشد.
 * الان: نوشتن در فایل JSONL محلی (بدون نیاز به سکرت).
 * بعداً: همین اینترفیس با آداپتور «گوگل شیت» جایگزین می‌شود؛
 * هیچ تغییری در روت API لازم نیست.
 */

export interface CallbackRequest {
  name: string;
  mobile: string;
  tourSlug?: string;
  source?: string;
  createdAt: string;
}

export interface CallbackStore {
  save(request: CallbackRequest): Promise<void>;
}

import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");
const FILE_PATH = join(DATA_DIR, "callbacks.jsonl");

class JsonlCallbackStore implements CallbackStore {
  async save(request: CallbackRequest): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(FILE_PATH, JSON.stringify(request) + "\n", "utf8");
  }
}

// TODO: آداپتور گوگل شیت این‌جا می‌نشیند و همین متغیر را می‌گیرد.
export const callbackStore: CallbackStore = new JsonlCallbackStore();
