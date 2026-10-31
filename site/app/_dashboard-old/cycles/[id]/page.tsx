import { Suspense } from "react";
import CyclePageClient from "./CyclePageClient";

export function generateStaticParams() {
/* شناسهٔ چرخه‌ها پویاست؛ یک نمونه برای اعتبارسنجی بیلد کافی است،
     بقیه در زمان درخواست رندر می‌شوند (dynamicParams پیش‌فرض). */
  return [{ id: 'latest' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <CyclePageClient id={id} />
    </Suspense>
  );
}
