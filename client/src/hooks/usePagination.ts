import { useEffect, useMemo, useState } from 'react';

/**
 * Client-side pagination over an already-loaded array.
 * Returns the current page's items plus paging controls.
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Keep the page in range when the list shrinks (e.g. after filtering/search)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (page - 1) * pageSize;
  const pageItems = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize],
  );

  return { page, setPage, totalPages, pageItems, total, pageSize, start };
}
