import { ArrowLeft } from 'lucide-react'

export interface TourCardProps {
  title: string
  duration: string
  price: string
}

export const TourCard = ({ title, duration, price }: TourCardProps) => {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden transition duration-200">
      <div className="relative">
        <img src="/placeholder-tour.jpg" alt={title} className="w-full h-48 object-cover" />
        <button className="absolute end-4 top-4 bg-background text-foreground border border-border px-3 py-1.5 rounded flex items-center gap-1.5 text-sm hover:bg-muted transition duration-200">
          <ArrowLeft className="w-4 h-4" />
          رزرو
        </button>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-pinar text-foreground text-lg leading-tight">{title}</h3>
        <div className="text-muted-foreground text-sm font-iransans">مدت زمان: {duration}</div>
        <div className="text-foreground text-xl font-bold">{price}</div>
      </div>
    </div>
  )
}
