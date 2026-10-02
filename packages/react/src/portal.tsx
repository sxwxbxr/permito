import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePermitoContext } from "./context";

/** `true` renders into the provider's `portalContainer` (default `document.body`), an element renders into it, `false` renders in place. */
export type PortalTarget = boolean | Element;

/**
 * Renders fixed-position UI outside the component tree, so ancestors with `transform`,
 * `filter` or `contain` cannot clip it or change its stacking context.
 */
export function Portal({
  target = true,
  children,
}: {
  target?: PortalTarget;
  children: ReactNode;
}) {
  const { portalContainer } = usePermitoContext();
  if (target === false || typeof document === "undefined") return <>{children}</>;
  const container = target === true ? (portalContainer ?? document.body) : target;
  return createPortal(children, container);
}
