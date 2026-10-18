import { ThailandTourCard } from '../../components/tour/thailand-tour-card';

export function ThailandTourPage() {
  const tour = {
    title: 'سفر به تایلند',
    description: 'یک سفر فوق‌العاده به کشور لبخندها، با برنامه‌ای کامل از دیدنی‌ها.',
    price: 12500000,
    imageUrl: '/images/thailand-main.jpg',
    location: 'بانکوک، تایلند',
    duration: '۷ روز و ۶ شب',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto ps-4 pe-4 py-8">
        <h1 className="font-pinar font-bold text-foreground text-3xl">
          تورهای تایلند
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          <ThailandTourCard {...tour} />
          <ThailandTourCard {...tour} />
          <ThailandTourCard {...tour} />
        </div>
      </div>
    </div>
  );
}
