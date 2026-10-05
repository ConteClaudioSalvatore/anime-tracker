import { createContext } from "react";

export interface CoverBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const CoverViewportContext = createContext<CoverBounds | null>(null);

export function intersectsCoverViewport(
  row: CoverBounds,
  viewport: CoverBounds | null,
) {
  return (
    !!viewport &&
    row.width > 0 &&
    row.height > 0 &&
    viewport.width > 0 &&
    viewport.height > 0 &&
    row.x < viewport.x + viewport.width &&
    row.x + row.width > viewport.x &&
    row.y < viewport.y + viewport.height &&
    row.y + row.height > viewport.y
  );
}
