import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/lib/useSortState";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  activeSortKey: string | null;
  activeSortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}

export function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  activeSortDir,
  onSort,
  className,
  align = "left",
}: SortableHeaderProps) {
  const isActive = activeSortKey === sortKey;

  return (
    <TableHead
      className={cn(
        "select-none cursor-pointer group whitespace-nowrap",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 transition-colors",
          align === "right" && "flex-row-reverse",
          isActive ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-800",
        )}
      >
        {label}
        {isActive ? (
          activeSortDir === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 opacity-30 group-hover:opacity-60" />
        )}
      </span>
    </TableHead>
  );
}
