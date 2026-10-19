import React from 'react';
import { ThailandTourCard } from '../tour/thailand-tour-card';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 flex flex-col gap-6 text-start">
            <h1 className="font-pinar text-4xl lg:text-5xl font-bold text-foreground">
              سفر به بهشت گرمسیری تایلند
            </h1>
            <p className="font-iransans text-base text-muted-foreground leading-relaxed">
              با تورهای اختصاصی تایلندگرد، لحظاتی فراموش‌نشدنی را در سواحل رویایی پوکت، پاتایا و بانکوک تجربه کنید.
            </p>
          </div>
          <div className="w-full lg:w-[420px] shrink-0">
            <ThailandTourCard />
          </div>
        </div>
      </div>
    </section>
  );
}
