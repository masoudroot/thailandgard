import { SectionHeading, StoreCard, NeighborhoodBadge } from 'vibefarsi';
import { ArrowLeft } from 'lucide-react';

export interface StoreItem {
  name: string;
  neighborhood: string;
  address: string;
  description: string;
  phone?: string;
  hours?: string;
}

export interface BangkokHalloweenStoreListProps {
  title?: string;
  stores: StoreItem[];
}

function toPersianNumbers(text: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return text.replace(/\d/g, (d) => persianDigits[Number(d)]);
}

function convertStoreNumbers(store: StoreItem): StoreItem {
  const convert = (s: string) => toPersianNumbers(s);
  return {
    name: convert(store.name),
    neighborhood: convert(store.neighborhood),
    address: convert(store.address),
    description: convert(store.description),
    phone: store.phone ? convert(store.phone) : undefined,
    hours: store.hours ? convert(store.hours) : undefined,
  };
}

export function BangkokHalloweenStoreList(props: BangkokHalloweenStoreListProps) {
  const { title = 'فروشگاه‌های لباس هالووین در بانکوک', stores } = props;
  const activeTitle = toPersianNumbers(title);
  const activeStores = stores.map(convertStoreNumbers);

  return (
    <section className="bg-background rounded-lg border py-6 px-4 transition duration-200">
      <SectionHeading className="font-pinar text-foreground">
        {activeTitle}
      </SectionHeading>
      <div className="grid gap-4 mt-4">
        {activeStores.map((store) => (
          <div
            key={`${store.name}-${store.address}`}
            className="flex justify-between items-start gap-3 p-4 rounded-lg border bg-muted"
          >
            <NeighborhoodBadge name={store.neighborhood} className="font-iransans" />
            <div className="flex-1">
              <StoreCard store={store} />
              <div className="mt-2 text-start">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-foreground font-iransans"
                >
                  <span>مشاهده جزئیات</span>
                  <ArrowLeft size={16} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
