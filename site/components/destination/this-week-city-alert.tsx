import React from 'react';
import { PhuketWeatherAlert } from './phuket-weather-alert';

export function ThisWeekCityAlert() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold font-pinar text-foreground">
          گزارش و هشدارهای شهری این هفته
        </h2>
        <p className="text-sm text-muted-foreground">
          آخرین اطلاعات و نکات ایمنی برای مقاصد گردشگری محبوب در این هفته.
        </p>
      </div>

      <div className="space-y-4">
        <PhuketWeatherAlert 
          title="هشدار ویژه شرایط جوی پوکت"
          description="با توجه به تغییرات ناگهانی آب‌وهوا در منطقه ساحلی، رعایت نکات ایمنی و همراه داشتن پوشش مناسب توصیه می‌شود."
          seasonInfo="فصل گذار و بارش‌های پراکنده"
          temperature="۳۰ درجه سانتی‌گراد"
          rainfall="۱۸۰ میلی‌متر در ماه"
        />
      </div>
    </div>
  );
}

export default ThisWeekCityAlert;
