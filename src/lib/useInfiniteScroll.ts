import { useEffect, useRef } from "react";

/**
 * Attach this ref to a sentinel element placed at the bottom of a scrollable
 * list. When the sentinel intersects the viewport (or scroll container) and
 * `hasMore` is true, `onLoadMore` is invoked. Re-entry is debounced via the
 * `isLoading` flag.
 */
export function useInfiniteScroll<T extends HTMLElement>({
  hasMore,
  isLoading,
  onLoadMore,
}: {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  return ref;
}

export const PAGE_SIZE = 50;
