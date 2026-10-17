import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Star, ArrowLeft, Calendar, Tag } from "lucide-react"

interface BangkokPattayaTourCardProps {
  title: string
  durationDays: number
  price: number
  rating: number
  imageUrl: string
  onReserve: () => void
}

function toPersianNumber(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
  return num
    .toString()
    .replace(/\d/g, (digit) => persianDigits[parseInt(digit)])
}

function toPersianPrice(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
  const str = num.toString()
  let result = ""
  let count = 0
  for (let i = str.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) {
      result = "٬" + result
    }
    result = persianDigits[parseInt(str[i])] + result
    count++
  }
  return result
}

export function BangkokPattayaTourCard({
  title,
  durationDays,
  price,
  rating,
  imageUrl,
  onReserve,
}: BangkokPattayaTourCardProps) {
  const clampedRating = Math.min(Math.max(rating, 0), 5)

  return (
    <Card className="overflow-hidden border bg-background rounded-[22px] transition duration-200">
      <div className="relative">
        <AspectRatio ratio={4 / 3}>
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        </AspectRatio>
        <Badge
          variant="secondary"
          className="absolute top-3 end-3 flex items-center gap-1 bg-background/90 text-foreground"
        >
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-iransans text-sm">
            {toPersianNumber(clampedRating)}
          </span>
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-pinar font-bold text-foreground text-start text-lg leading-relaxed mb-3">
          {title}
        </h3>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="font-iransans text-sm">مدت تور</span>
          </div>
          <span className="font-iransans text-foreground text-sm">
            {toPersianNumber(durationDays)} روز
          </span>
        </div>
        <Separator className="my-2" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Tag className="h-4 w-4" />
            <span className="font-iransans text-sm">قیمت</span>
          </div>
          <span className="font-iransans text-foreground text-sm">
            {toPersianPrice(price)} تومان
          </span>
        </div>
        <Button
          onClick={onReserve}
          className="w-full font-iransans transition duration-200"
        >
          <span>رزرو تور</span>
          <ArrowLeft className="h-4 w-4 me-2" />
        </Button>
      </CardContent>
    </Card>
  )
}
