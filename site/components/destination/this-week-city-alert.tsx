import { AlertTriangle, ArrowLeft } from "lucide-react";

interface ThisWeekCityAlertProps {
  icon?: React.ReactNode;
  title: string;
  summary: string;
  detailLink: string;
  badge?: string;
}

export function ThisWeekCityAlert({
  icon,
  title,
  summary,
  detailLink,
  badge,
}: ThisWeekCityAlertProps) {
  return (
    <div className="rounded-s-[22px] rounded-e-[22px] border border-border bg-background transition duration-200">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">
          {icon || (
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {badge && (
              <span className="inline-flex items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {badge}
              </span>
            )}
            <h3 className="font-pinar text-base font-bold text-foreground leading-snug">
              {title}
            </h3>
          </div>
          <p className="font-iransans text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {summary}
          </p>
          <a
            href={detailLink}
            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-foreground hover:text-muted-foreground transition duration-200"
          >
            <span>جزئیات بیشتر</span>
            <ArrowLeft className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
