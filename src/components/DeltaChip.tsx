interface DeltaChipProps {
  current: number | null | undefined;
  reference: number | null | undefined;
  isInverse?: boolean;
}

export function DeltaChip({ current, reference, isInverse = false }: DeltaChipProps) {
  if (
    current == null ||
    reference == null ||
    reference === 0 ||
    !Number.isFinite(current) ||
    !Number.isFinite(reference)
  ) {
    return (
      <span className="block text-[0.85em] font-normal text-slate-400 tabular-nums">
        —
      </span>
    );
  }

  const delta = ((current - reference) / Math.abs(reference)) * 100;

  if (!Number.isFinite(delta)) {
    return (
      <span className="block text-[0.85em] font-normal text-slate-400 tabular-nums">
        —
      </span>
    );
  }

  if (delta === 0) {
    return (
      <span className="block text-[0.85em] font-normal text-slate-400 tabular-nums">
        (0.0%)
      </span>
    );
  }

  const isPositive = delta > 0;
  const isGood = isInverse ? !isPositive : isPositive;
  const sign = isPositive ? "+" : "";
  const colorClass = isGood ? "text-green-400" : "text-red-400";

  return (
    <span className={`block text-[0.85em] font-normal tabular-nums ${colorClass}`}>
      ({sign}{delta.toFixed(1)}%)
    </span>
  );
}
