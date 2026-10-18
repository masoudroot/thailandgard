import { ThailandTourCard } from '@/components/tour/thailand-tour-card';

export default function ThailandTourPage() {
  const sampleTour = {
    name: 'تور شگفت‌انگیز تایلند',
    duration: '7 روز و 6 شب',
    price: 12500000,
    currency: 'تومان',
    image: '/images/thailand.jpg',
    rating: 4.8,
    reviewsCount: 234,
    badge: 'پیشنهاد هفته',
  };

  return (
    <main className="min-h-screen bg-background p-8" dir="rtl">
      <h1 className="font-pinar text-2xl text-foreground mb-8">
        {'تورهای تایلند'}
      </h1>
      <div className="flex flex-wrap gap-6">
        <ThailandTourCard tour={sampleTour} variant="standard" showDiscount onSelect={(tour) => console.log(tour)} />
        <ThailandTourCard tour={{ ...sampleTour, name: 'تور اقتصادی بانکوک', badge: undefined }} variant="compact" />
      </div>
    </main>
  );
}
