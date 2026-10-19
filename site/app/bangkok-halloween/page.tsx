import { BangkokHalloweenStoreList, StoreItem } from '@/components/destination/bangkok-halloween-store-list';

export default function Page() {
  const stores: StoreItem[] = [
    {
      name: 'فروشگاه کاستوم هالووین',
      neighborhood: 'پراتونام',
      address: '۴۵/۲ سوکومویت سویت',
      description: 'فروشگاه بزرگ لباس هالووین با تنوع بالا',
      phone: '۰۲۶۶۶۵۵۴۴',
      hours: '۰۹:۰۰ - ۲۲:۰۰',
    },
    {
      name: 'بوتیک هالووین بانکوک',
      neighborhood: 'سوکومویت',
      address: '۱۲۳ سوکومویت پلازا',
      description: 'لباس‌های هالووین دست‌دوز و مدرن',
      phone: '۰۲۵۵۴۴۳۳۲۲',
      hours: '۱۰:۰۰ - ۲۱:۰۰',
    },
    {
      name: 'مارکت لباس هالووین لات پراو',
      neighborhood: 'لات پراو',
      address: '۷۸ لات پراو رود',
      description: 'بازار روزانه با غرفه‌های متعدد',
      phone: '۰۲۱۲۳۴۵۶۷۸',
      hours: '۰۸:۰۰ - ۲۰:۰۰',
    },
  ];

  return (
    <main className="bg-background min-h-screen">
      <BangkokHalloweenStoreList
        title="راهنمای فروشگاه‌های هالووین بانکوک"
        stores={stores}
      />
    </main>
  );
}
