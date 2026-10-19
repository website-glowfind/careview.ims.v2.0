import type { CSSProperties } from 'react';

/**
 * Position for a row action menu rendered with `position: fixed`, so it is never
 * clipped by a scrolling/overflow table. Opens below the button when there is room,
 * otherwise above; if neither fits, pins to the top and scrolls.
 */
export function menuPosition(rect: DOMRect | null, estHeight = 300): CSSProperties {
  if (!rect) return {};
  const vh = window.innerHeight;
  const right = Math.max(8, window.innerWidth - rect.right);
  if (vh - rect.bottom >= estHeight + 8) return { top: rect.bottom + 4, right };
  if (rect.top >= estHeight + 8) return { bottom: vh - rect.top + 4, right };
  return { top: 8, right, maxHeight: vh - 16, overflowY: 'auto' };
}
