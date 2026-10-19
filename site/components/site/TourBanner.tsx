import { ArrowLeft } from 'lucide-react';
import { ThailandTourCard } from '../tour/thailand-tour-card';

export default function TourBanner() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-pinar text-foreground text-3xl">تورهای تایلند</h2>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition duration-200">
          <span>مشاهده همه</span>
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ThailandTourCard
          image="https://example.com/thailand1.jpg"
          title="تور تایلند ۷ روزه"
          subtitle="تور بهشت روی زمین"
          rating={4.8}
          reviews={124}
          price={12500000}
          duration="۷ روز"
        />
        <ThailandTourCard
          image="https://example.com/thailand2.jpg"
          title="تور تایلند ۵ روزه"
          subtitle="تور بهشت روی زمین"
          rating={4.7}
          reviews={98}
          price={9800000}
          duration="۵ روز"
        />
        <ThailandTourCard
          image="https://example.com/thailand3.jpg"
          title="تور تایلند ۱۰ روزه"
          subtitle="تور بهشت روی زمین"
          rating={4.9}
          reviews={56}
          price={15600000}
          duration="۱۰ روز"
        />
        <ThailandTourCard
          image="https://example.com/thailand4.jpg"
          title="تور تایلند ۴ روزه"
          subtitle="تور بهشت روی زمین"
          rating={4.6}
          reviews={210}
          price={7800000}
          duration="۴ روز"
        />
      </div>
    </div>
  );
}
