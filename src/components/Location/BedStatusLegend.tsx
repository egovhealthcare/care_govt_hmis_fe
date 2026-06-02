import { Bed } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

interface BedStatusLegendProps {
  className?: string;
}

export function BedStatusLegend({ className }: BedStatusLegendProps) {
  const { t } = useTranslation();

  const statuses = [
    { color: "text-gray-600", label: "available" },
    { color: "text-green-600", label: "available_selected" },
    { color: "text-gray-400", label: "occupied" },
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {statuses.map((status) => (
        <div key={status.label} className="flex items-center gap-2">
          <Bed className={cn("size-5", status.color)} />
          <span className="text-xs">{t(status.label)}</span>
        </div>
      ))}
    </div>
  );
}
