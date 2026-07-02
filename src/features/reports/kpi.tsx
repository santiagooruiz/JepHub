import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tile,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tile?: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      {Icon && (
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-lg text-white ${tile ?? "bg-primary"}`}
        >
          <Icon className="size-6" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        <p className="tabular mt-0.5 text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
