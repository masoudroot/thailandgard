import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plane, Clock, Info } from "lucide-react";

export interface VisaInfoCardProps {
  status: "required" | "not-required" | "on-arrival";
  validity: string;
  description: string;
}

const statusMap = {
  required: { label: "نیاز به ویزا", variant: "destructive" as const },
  "not-required": { label: "بدون ویزا", variant: "default" as const },
  "on-arrival": { label: "ویزای فرودگاهی", variant: "secondary" as const },
};

function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (d) =>
    String.fromCharCode(0x06f0 + parseInt(d, 10))
  );
}

export function VisaInfoCard({
  status,
  validity,
  description,
}: VisaInfoCardProps) {
  const { label, variant } = statusMap[status];

  return (
    <div className="font-iransans rounded-[22px] border bg-background p-4 transition duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-amber-600" />
          <h3 className="font-pinar text-base font-bold text-foreground">
            شرایط ویزای تایلند
          </h3>
        </div>
        <Badge variant={variant}>{toPersianDigits(label)}</Badge>
      </div>

      <Separator className="my-3" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-amber-600" />
          <span>
            مدت اعتبار: {" "}
            <span className="text-foreground">
              {toPersianDigits(validity)}
            </span>
          </span>
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 text-amber-600" />
          <p className="leading-relaxed">{toPersianDigits(description)}</p>
        </div>
      </div>
    </div>
  );
}
