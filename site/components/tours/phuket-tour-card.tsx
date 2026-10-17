import Image from "next/image"
import { ArrowRight, Calendar, Clock, MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AspectRatio } from "@/components/ui/aspect-ratio"

interface PhuketTourCardProps {
  title: string
  duration: string
  price: number
  image: string
  rating?: number
  reviewCount?: number
  isPopular?: boolean
  discount?: number
  onReserve?: () => void
}

function toPersianNumber(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
  return num
    .toString()
    .replace(/\d/g, (d) => persianDigits[parseInt(d)])
}

function formatPrice(price: number): string {
  const formatted = price.toLocaleString("en-US")
  return toPersianNumber(parseInt(formatted.replace(/,/g, "")))
    .replace(/\B(?=(\d{3})+(?!\d))/g, "٬")
}

export function PhuketTourCard({
  title,
  duration,
  price,
  image,
  rating = 4.8,
  reviewCount = 128,
  isPopular = false,
  discount,
  onReserve,
}: PhuketTourCardProps) {
  const finalPrice = discount ? Math.round(price * (1 - discount / 100)) : price

  return (
    <div className="group flex flex-col overflow-hidden rounded-[22px] border border-border bg-background transition-all duration-200 hover:border-muted-foreground/20">
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </AspectRatio>
        {isPopular && (
          <Badge
            variant="secondary"
            className="absolute top-3 end-3 bg-background/90 font-iransans text-xs"
          >
            پرفروش
          </Badge>
        )}
        {discount && discount > 0 && (
          <Badge
            variant="destructive"
            className="absolute top-3 start-3 font-iransans text-xs"
          >
            {toPersianNumber(discount)}٪ تخفیف
          </Badge>
        )}
        <div className="absolute bottom-3 start-3 flex items-center gap-1 rounded-lg bg-background/90 px-2 py-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-iransans text-xs text-muted-foreground">
            {toPersianNumber(rating)} ({toPersianNumber(reviewCount)} نظر)
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-pinar text-base font-bold text-foreground line-clamp-2">
            {title}
          </h3>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-iransans text-sm text-muted-foreground">
              {duration}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-iransans text-sm text-muted-foreground">
              پوکت، تایلند
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-iransans text-sm text-muted-foreground">
            هر روز هفته
          </span>
        </div>

        <Separator className="my-4" />

        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1">
            {discount && discount > 0 && (
              <span className="font-iransans text-sm text-muted-foreground line-through">
                {formatPrice(price)} تومان
              </span>
            )}
            <span className="font-pinar text-lg font-bold text-foreground">
              {formatPrice(finalPrice)} تومان
            </span>
          </div>
          <Button
            onClick={onReserve}
            className="gap-1 rounded-lg font-iransans text-sm"
          >
            <span>رزرو</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
