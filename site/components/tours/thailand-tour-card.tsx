import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, Star } from 'lucide-react'

interface Tour {
  id: string
  title: string
  nights: number
  pricePerPerson: number
  rating: number
  imageSrc: string
  slug: string
}

interface ThailandTourCardProps {
  tour: Tour
  onReserve?: (id: string) => void
  variant?: 'default' | 'featured'
}

function toPersianNumber(num: number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return num.toString().replace(/\d/g, (digit) => persianDigits[parseInt(digit)])
}

function formatPrice(price: number): string {
  const persianPrice = toPersianNumber(price)
  const withCommas = persianPrice.replace(/\B(?=(\d{3})+(?!\d))/g, '،')
  return `${withCommas} تومان`
}

export function ThailandTourCard({
  tour,
  onReserve,
  variant = 'default',
}: ThailandTourCardProps) {
  const isFeatured = variant === 'featured'

  const handleReserve = () => {
    if (onReserve) {
      onReserve(tour.id)
    }
  }

  const cardContent = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg">
        <Image
          src={tour.imageSrc}
          alt={tour.title}
          fill
          className="object-cover transition-transform duration-200 hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {isFeatured && (
          <div className="absolute start-0 top-0 bg-amber-500 px-3 py-1 text-sm font-medium text-white rounded-se-lg">
            ویژه
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="font-pinar text-lg font-bold text-foreground line-clamp-2">
          {tour.title}
        </h3>
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
          <span className="text-sm text-foreground">{toPersianNumber(Math.round(tour.rating * 10) / 10)}</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">مدت اقامت</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{toPersianNumber(tour.nights)} شب</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">قیمت هر نفر</span>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{formatPrice(tour.pricePerPerson)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleReserve}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-amber-600"
        >
          <span>رزرو تور</span>
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
    </>
  )

  return (
    <div
      className={`flex flex-col overflow-hidden border bg-background transition-all duration-200 hover:border-amber-500 ${
        isFeatured ? 'rounded-[22px] border-amber-500' : 'rounded-lg'
      }`}
    >
      {cardContent}
    </div>
  )
}