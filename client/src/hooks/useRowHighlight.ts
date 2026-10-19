import { useEffect, useState } from 'react';
import { useHighlightStore } from '@/store/highlightStore';

/**
 * Consumes a pending highlight request: jumps to the page holding the record,
 * scrolls it into view, and keeps it highlighted for a few seconds.
 * Returns the device code currently highlighted (or null).
 */
export function useRowHighlight<T>(items: T[], getCode: (item: T) => string | undefined, setPage: (p: number) => void, pageSize: number): string | null {
  const code = useHighlightStore((s) => s.deviceCode);
  const clear = useHighlightStore((s) => s.clear);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const idx = items.findIndex((i) => getCode(i) === code);
    if (idx < 0) return; // data may still be loading — try again when items change
    setPage(Math.floor(idx / pageSize) + 1);
    setActive(code);
    clear();
    setTimeout(() => document.querySelector(`[data-row="${CSS.escape(code)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    setTimeout(() => setActive((c) => (c === code ? null : c)), 4000);
  }, [code, items]); // eslint-disable-line react-hooks/exhaustive-deps

  return active;
}

export const HIGHLIGHT_ROW = 'bg-amber-50 dark:bg-amber-500/10 ring-2 ring-inset ring-amber-400 transition-colors';
