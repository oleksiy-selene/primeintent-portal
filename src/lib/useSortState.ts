import { useCallback, useState } from "react";

export type SortDir = "asc" | "desc";

export interface SortState<K extends string> {
  sortKey: K | null;
  sortDir: SortDir;
}

export interface UseSortStateReturn<K extends string> extends SortState<K> {
  toggleSort: (key: K) => void;
  resetSort: () => void;
}

/**
 * Tri-state sort cycle per column:
 *   click any column      → asc
 *   same col (asc)        → desc
 *   same col (desc)       → reset (sortKey → null, using caller's default)
 *
 * sortKey is ALWAYS null at rest so the default-sorted column can still cycle.
 * Callers should use `sortKey ?? "created_at"` when building queries.
 *
 * Uses a single state object so the updater always reads current values —
 * no stale-closure risk from capturing sortDir in a useCallback dep array.
 */
export function useSortState<K extends string>(
  _defaultKey: K | null = null,
  defaultDir: SortDir = "desc",
): UseSortStateReturn<K> {
  const [state, setState] = useState<SortState<K>>({
    sortKey: null,
    sortDir: defaultDir,
  });

  const toggleSort = useCallback(
    (key: K) => {
      setState((prev) => {
        if (prev.sortKey !== key) {
          return { sortKey: key, sortDir: "asc" };
        }
        if (prev.sortDir === "asc") {
          return { sortKey: key, sortDir: "desc" };
        }
        return { sortKey: null, sortDir: defaultDir };
      });
    },
    [defaultDir],
  );

  const resetSort = useCallback(() => {
    setState({ sortKey: null, sortDir: defaultDir });
  }, [defaultDir]);

  return { sortKey: state.sortKey, sortDir: state.sortDir, toggleSort, resetSort };
}
