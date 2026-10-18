import { AlertTriangle, CloudRain, Mountain, Waves } from "lucide-react";

interface WeatherWarningBoxProps {
  region?: string;
  endDate?: string;
}

export function WeatherWarningBox({
  region = "جنوب تایلند",
  endDate = "۱۸ اکتبر",
}: WeatherWarningBoxProps) {
  const warnings = [
    {
      icon: CloudRain,
      title: "بارش سنگین",
      description: `بارش شدید و رگبار در ${region} تا ${endDate}`,
      severity: "high" as const,
    },
    {
      icon: Mountain,
      title: "رانش زمین سامویی",
      description: "خطر رانش زمین در مناطق کوهستانی سامویی",
      severity: "critical" as const,
    },
    {
      icon: Waves,
      title: "مدیریت بحران",
      description: "اعلام وضعیت آماده‌باش برای نهادهای امدادی",
      severity: "medium" as const,
    },
  ];

  const severityStyles = {
    critical: "bg-destructive/15 text-destructive border-destructive/30",
    high: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    medium: "bg-muted text-muted-foreground border-border",
  };

  const severityLabels = {
    critical: "بحرانی",
    high: "شدید",
    medium: "متوسط",
  };

  return (
    <div className="rounded-lg border bg-background p-4 transition duration-200">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="font-pinar text-lg font-bold text-foreground">
          هشدار اضطراری آب‌وهوا
        </h2>
      </div>

      <div className="space-y-3">
        {warnings.map((warning, index) => {
          const Icon = warning.icon;
          return (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 transition duration-200"
            >
              <div className="mt-0.5 flex-shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-pinar text-sm font-bold text-foreground">
                    {warning.title}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${severityStyles[warning.severity]}`}
                  >
                    {severityLabels[warning.severity]}
                  </span>
                </div>
                <p className="font-iransans text-sm text-muted-foreground leading-relaxed">
                  {warning.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <p className="font-iransans text-xs text-muted-foreground">
          آخرین به‌روزرسانی: امروز، ساعت ۰۸:۳۰
        </p>
      </div>
    </div>
  );
}
