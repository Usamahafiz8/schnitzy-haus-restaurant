import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  changePct,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  changePct?: number;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  const showChange = changePct !== undefined && Number.isFinite(changePct);
  const up = (changePct ?? 0) >= 0;

  return (
    <Card className={cn(accent && "border-primary/40 bg-brand-50/50 ")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
        </div>

        <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>

        <div className="mt-1 flex items-center gap-2 text-xs">
          {showChange && (
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium",
                up
                  ? "text-emerald-700 "
                  : "text-destructive",
              )}
            >
              {up ? (
                <ArrowUpRight className="size-3" aria-hidden />
              ) : (
                <ArrowDownRight className="size-3" aria-hidden />
              )}
              {Math.abs(changePct!)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
