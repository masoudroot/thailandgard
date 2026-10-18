import React from 'react';
import { CloudRain, AlertTriangle, Thermometer, Wind } from 'lucide-react';

export interface PhuketWeatherAlertProps {
  title?: string;
  description?: string;
  seasonInfo?: string;
  temperature?: string;
  rainfall?: string;
}

export function PhuketWeatherAlert({
  title = "هشدار شرایط فصلی و آب‌وهوای پوکت",
  description = "پوکت در این بازه زمانی تحت تأثیر بارش‌های موسمی قرار دارد. لطفاً پیش از رزرو گشت‌های دریایی، به وضعیت هشدار طوفان و شرایط ایمنی ساحل توجه فرمایید.",
  seasonInfo = "فصل بارندگی (مونسون)",
  temperature = "۳۱ درجه سانتی‌گراد",
  rainfall = "۲۳۰ میلی‌متر در ماه",
}: PhuketWeatherAlertProps) {
  return (
    <div className="w-full rounded-[22px] border border-border bg-background p-6 text-foreground duration-200 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-amber-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-amber-600">
              <CloudRain className="h-3.5 w-3.5" />
              {seasonInfo}
            </span>
            <span className="text-xs text-muted-foreground">
              به‌روزرسانی: امروز
            </span>
          </div>
          <h3 className="text-lg font-bold font-pinar">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 p-3">
              <Thermometer className="h-4 w-4 text-amber-600" />
              <div className="text-xs">
                <span className="block text-muted-foreground">میانگین دما</span>
                <span className="font-bold font-iransans text-foreground">{temperature}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 p-3">
              <Wind className="h-4 w-4 text-amber-600" />
              <div className="text-xs">
                <span className="block text-muted-foreground">وضعیت بارش</span>
                <span className="font-bold font-iransans text-foreground">{rainfall}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
