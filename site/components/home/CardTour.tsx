import { ArrowLeft } from 'lucide-react';

export const CardTour = () => {
  return (
    <div className="wfb-card w-full max-w-[320px] bg-background border border border-foreground text-foreground rounded-[22px] p-5 transition duration-200 hover:bg-muted">
      <div className="relative overflow-hidden rounded-[22px] mb-4">
        <div className="aspect-video bg-muted" />
      </div>
      <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <span className="bg-muted px-2 py-0.5 rounded">تور</span>
        <span className="bg-muted px-2 py-0.5 rounded">گروهی</span>
      </div>
      <h3 className="font-pinar text-xl leading-tight mb-3">پینار FD</h3>
      <div className="mb-4">
        <p className="text-muted-foreground mb-1">ایرانسانس X</p>
        <div className="flex items-center justify-between">
          <p className="text-foreground font-semibold text-lg">۱۲٬۵۰۰٬۰۰۰ تومان</p>
          <div className="flex items-center text-muted-foreground">
            <span className="text-xs me-1">عنوان</span>
            <ArrowLeft className="w-4 h-4" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>۵ روز</div>
        <div>۳ شب</div>
      </div>
    </div>
  );
};