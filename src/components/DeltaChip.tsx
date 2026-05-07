interface DeltaChipProps {
  current: number | null | undefined;
  reference: number | null | undefined;
  isInverse?: boolean;
}

function NA() {
  return (
    <span className="block text-[0.85em] font-normal text-slate-300 tabular-nums">
      n/a
    </span>
  );
}

export function DeltaChip({ current, reference, isInverse = false }: DeltaChipProps) {
  const refPositive =
    reference != null && Number.isFinite(reference) && reference > 0;

  if (refPositive && (current == null || current === 0)) {
    return (
      <span className="block text-[0.85em] font-semibold text-red-500">
        GONE
      </span>
    );
  }

  if (current == null || !Number.isFinite(current)) {
    return <NA />;
  }

  const refMissing = reference == null || reference === 0 || !Number.isFinite(reference);

  if (refMissing) {
    if (current > 0) {
      const colorClass = isInverse ? "text-red-400" : "text-emerald-600";
      return (
        <span className={`block text-[0.85em] font-semibold ${colorClass}`}>
          NEW
        </span>
      );
    }
    return <NA />;
  }

  const delta = ((current - reference) / Math.abs(reference)) * 100;

  if (!Number.isFinite(delta)) {
    return <NA />;
  }

  if (delta === 0) {
    return (
      <span className="block text-[0.85em] font-normal text-slate-400 tabular-nums">
        (0%)
      </span>
    );
  }

  const isPositive = delta > 0;
  const isGood = isInverse ? !isPositive : isPositive;
  const sign = isPositive ? "+" : "";
  const colorClass = isGood ? "text-emerald-600" : "text-red-400";

  return (
    <span className={`block text-[0.85em] font-normal tabular-nums ${colorClass}`}>
      ({sign}{Math.round(delta)}%)
    </span>
  );
}
