import { type RefObject, useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.hasAttribute("inert") && element.getAttribute("aria-hidden") !== "true",
  );
}

let opener: HTMLElement | null = null;

/** Call right before a dialog opens: the opener may be unmounted by the time the dialog's effect runs. */
export function rememberOpener(): void {
  opener = document.activeElement as HTMLElement | null;
}

/** Gives focus back to the opener; re-finds it by `data-permito` if it was removed meanwhile. */
function restoreFocus(previous: HTMLElement | null, key: string | null): void {
  if (previous && document.contains(previous)) {
    previous.focus();
    return;
  }
  if (!key) return;
  setTimeout(() => {
    const active = document.activeElement;
    if (active && active !== document.body) return;
    document.querySelector<HTMLElement>(`[data-permito="${key}"]`)?.focus();
  }, 0);
}

/**
 * Keeps focus inside `ref` while active, closes on Escape, locks page scroll
 * and restores focus to the previously focused element afterwards.
 */
export function useModalFocus(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const previous =
      opener && opener !== document.body ? opener : (document.activeElement as HTMLElement | null);
    opener = null;
    const previousKey = previous?.getAttribute("data-permito") ?? null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    container.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable(container);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const current = document.activeElement;
      if (event.shiftKey && (current === first || current === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocus(previous, previousKey);
    };
  }, [ref, active, onEscape]);
}
