import React from 'react'
import { Star } from 'lucide-react'

export interface TestimonialsSectionProps {}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = () => {
  return (
    <section className="bg-background py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-pinar text-4xl font-bold text-foreground mb-4">نظرات مسافران تایلندگرد</h2>
          <p className="font-iransans text-muted-foreground text-lg">تجربه واقعی از سفر با تایلندگرد</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-background border border p-8 rounded-[22px] shadow-none flex flex-col h-full transition duration-200">
            <div className="flex items-center gap-1 mb-6">
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
            </div>
            <p className="font-iransans text-foreground leading-relaxed text-justify flex-1">سفر به تایلند با تایلندگرد بهترین انتخاب بود. همه چیز کاملاً هماهنگ و بدون دردسر بود. حتماً دوباره سفر می‌کنم.</p>
            <div className="mt-auto pt-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div>
                <p className="font-iransans font-semibold">علی رضایی</p>
                <p className="text-muted-foreground text-sm">تهران، ایران</p>
              </div>
            </div>
          </div>
          <div className="bg-background border border p-8 rounded-[22px] shadow-none flex flex-col h-full transition duration-200">
            <div className="flex items-center gap-1 mb-6">
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
            </div>
            <p className="font-iransans text-foreground leading-relaxed text-justify flex-1">مسافرت با تایلندگرد به Pattaya فوق‌العاده بود. آواتارها و نظرات واقعی همه چیز را شفاف کرده بود. تجربه‌ای بی‌نظیر.</p>
            <div className="mt-auto pt-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div>
                <p className="font-iransans font-semibold">سارا احمدی</p>
                <p className="text-muted-foreground text-sm">اصفهان، ایران</p>
              </div>
            </div>
          </div>
          <div className="bg-background border border p-8 rounded-[22px] shadow-none flex flex-col h-full transition duration-200">
            <div className="flex items-center gap-1 mb-6">
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
              <Star className="text-foreground" size={20} />
            </div>
            <p className="font-iransans text-foreground leading-relaxed text-justify flex-1">تایلندگرد بهترین سرویس گردشگری را ارائه داد. نظرات واقعی و آواتارها اعتمادم را کاملاً جلب کرد. سفر بعدی را همینجا رزرو می‌کنم.</p>
            <div className="mt-auto pt-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div>
                <p className="font-iransans font-semibold">محمد کریمی</p>
                <p className="text-muted-foreground text-sm">شیراز، ایران</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
