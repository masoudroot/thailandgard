import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { TourHighlights } from '../../../components/tour/tour-highlights';

const tour = {
  slug: 'thailand-weekend',
  title: 'تور جادویی تایلند',
  subtitle: 'بانکوک، پاتایا و جزیره‌های خلیج تایلند',
  location: 'تایلند، بانکوک',
  duration: '۷ شب و ۸ روز',
  groupSize: '۱۵ نفر',
  startDate: 'آبان ۱۴۰۵',
  price: '۱۲٬۵۰۰٬۰۰۰ تومان',
  image: '/images/tours/thailand.jpg',
  summary:
    'در این سفر ۸ روزه از معابد باشکوه بانکوک تا سواحل شنی جزیره‌های خلیج تایلند را می‌بینید و طعم اصیل غذاهای تایلندی را تجربه می‌کنید.',
  highlights: [
    'اقامت در هتل‌های ۴ و ۵ ستاره',
    'راهنمای فارسی‌زبان در تمام طول سفر',
    'ترانسفر فرودگاهی خصوصی',
    'بازدید از معبد بودای طلایی',
    'گشت دریایی به جزیره‌های خلیج تایلند',
    'وعده‌های غذایی منتخب با طعم اصیل تایلندی',
  ],
};

export function generateStaticParams() {
  return [{ slug: tour.slug }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (slug !== tour.slug) {
    return {
      title: 'تور یافت نشد | تایلندگرد',
    };
  }

  return {
    title: `${tour.title} | تایلندگرد`,
    description: tour.summary,
  };
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug !== tour.slug) {
    notFound();
  }

  return (
    <main className='bg-background font-iransans'>
      <article>
        <section className='relative h-[420px] overflow-hidden rounded-b-[22px] border-b border-border'>
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            priority
            sizes='100vw'
            className='object-cover'
          />
          <div className='absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent' />
          <div className='absolute inset-x-0 bottom-0 p-6 sm:p-10'>
            <p className='font-pinar text-sm font-bold text-amber-600'>
              {tour.location}
            </p>
            <h1 className='mt-2 font-pinar text-3xl font-bold text-foreground sm:text-4xl'>
              {tour.title}
            </h1>
            <p className='mt-3 max-w-2xl font-iransans text-sm leading-7 text-muted-foreground sm:text-base'>
              {tour.subtitle}
            </p>
          </div>
        </section>

        <div className='mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8'>
          <div className='grid gap-10 lg:grid-cols-[1fr_320px]'>
            <div>
              <section>
                <h2 className='font-pinar text-2xl font-bold text-foreground'>
                  معرفی تور
                </h2>
                <p className='mt-4 font-iransans text-sm leading-8 text-muted-foreground'>
                  {tour.summary}
                </p>
              </section>

              <TourHighlights
                title='ویژگی‌های برجسته تور'
                highlights={tour.highlights}
                className='mt-10'
              />

              <section className='mt-10'>
                <div className='flex items-center gap-2'>
                  <MapPin className='size-5 text-amber-600' aria-hidden='true' />
                  <h2 className='font-pinar text-2xl font-bold text-foreground'>
                    برنامه سفر
                  </h2>
                </div>
                <p className='mt-4 font-iransans text-sm leading-8 text-muted-foreground'>
                  راهنمای کاروان در روز اول شما را در فرودگاه بانکوک همراهی می‌کند.
                  سپس با اتوبوس اختصاصی به هتل منتقل می‌شوید. در روزهای بعدی،
                  بازدید از کاخ سلطنتی، بازار شناور و معبد بودای طلایی را در برنامه
                  داریم. روز پایانی به استراحت در ساحل اختصاص دارد.
                </p>
              </section>
            </div>

            <aside className='h-fit rounded-lg border border-border bg-muted p-6'>
              <h2 className='font-pinar text-xl font-bold text-foreground'>
                خلاصه سفر
              </h2>
              <dl className='mt-4 grid gap-4 text-sm'>
                <div className='flex items-center gap-3'>
                  <CalendarDays className='size-5 text-amber-600' aria-hidden='true' />
                  <div>
                    <dt className='text-muted-foreground'>تاریخ شروع</dt>
                    <dd className='mt-1 font-iransans font-medium text-foreground'>
                      {tour.startDate}
                    </dd>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <Clock className='size-5 text-amber-600' aria-hidden='true' />
                  <div>
                    <dt className='text-muted-foreground'>مدت سفر</dt>
                    <dd className='mt-1 font-iransans font-medium text-foreground'>
                      {tour.duration}
                    </dd>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <Users className='size-5 text-amber-600' aria-hidden='true' />
                  <div>
                    <dt className='text-muted-foreground'>ظرفیت گروه</dt>
                    <dd className='mt-1 font-iransans font-medium text-foreground'>
                      {tour.groupSize}
                    </dd>
                  </div>
                </div>
              </dl>
              <div className='mt-6 border-t border-border pt-5'>
                <p className='text-muted-foreground'>قیمت هر نفر</p>
                <p className='mt-2 font-pinar text-2xl font-bold text-foreground'>
                  {tour.price}
                </p>
              </div>
              <Link
                href='/contact'
                className='mt-6 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 font-iransans text-sm font-bold text-background transition duration-200 hover:bg-amber-600'
              >
                رزرو و مشاوره
                <ArrowLeft className='size-4' aria-hidden='true' />
              </Link>
            </aside>
          </div>
        </div>
      </article>
    </main>
  );
}
