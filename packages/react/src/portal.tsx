import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders fixed-position UI into `document.body`, so ancestors with `transform`,
 * `filter` or `contain` cannot clip it or change its stacking context.
 */
export function Portal({ enabled = true, children }: { enabled?: boolean; children: ReactNode }) {
  if (!enabled || typeof document === "undefined") return <>{children}</>;
  return createPortal(children, document.body);
}
