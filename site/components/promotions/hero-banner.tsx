import { ArrowLeft } from 'lucide-react';
export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border rounded-lg transition duration-200 bg-background">
      <img src="/images/tour-summer-hero.jpg" alt="تور تابستانی برجسته" className="w-full h-[420px] object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
      <div className="absolute inset-0 flex items-center p-10">
        <div className="max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-foreground" />
            <span className="uppercase text-xs tracking-widest font-bold text-muted-foreground">پروموشن ویژه</span>
          </div>
          <h1 className="font-pinar text-5xl leading-[1.1] text-foreground mb-4">تور تابستانی
استثنایی</h1>
          <p className="font-iransans text-muted-foreground mb-8">اجاره ویلا در شمال تا ۴۰٬۰۰۰ تومان تخفیف
اقامت ۷ شب</p>
          <a href="#book" className="inline-flex items-center gap-2 bg-muted text-foreground font-bold px-8 py-4 rounded-[22px] hover:bg-foreground hover:text-background transition duration-200">
            رزرو حالا
            <ArrowLeft className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
}