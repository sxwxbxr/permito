import { format, type LoadScriptOptions, loadScript } from "@permitojs/core";
import { type IframeHTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react";
import { usePermitoContext } from "./context";
import { useIsAllowed } from "./hooks";
import { Portal, type PortalTarget } from "./portal";
import { cx } from "./utils";

/** Exactly one of `category` or `service` decides whether the content is allowed. */
export type ConsentTarget =
  | { category: string; service?: never }
  | { service: string; category?: never };

export type ConsentGateProps = ConsentTarget & {
  children?: ReactNode;
  /** Rendered while consent is missing. */
  fallback?: ReactNode;
};

/** Renders `children` only once consent is granted. */
export function ConsentGate({ children, fallback = null, ...target }: ConsentGateProps) {
  return <>{useIsAllowed(target) ? children : fallback}</>;
}

export type ConsentScriptProps = ConsentTarget &
  Omit<LoadScriptOptions, "src"> & {
    src: string;
    onLoad?: (script: HTMLScriptElement) => void;
    onError?: (error: Error) => void;
  };

/**
 * Loads an external script after consent. Nothing is rendered during SSR.
 * Revoking consent cannot unload a script that already ran.
 */
export function ConsentScript({
  category,
  service,
  src,
  onLoad,
  onError,
  ...options
}: ConsentScriptProps) {
  const allowed = useIsAllowed(service ? { service } : { category: category as string });
  // Options and callbacks are read when consent is granted, not tracked as dependencies.
  const latest = useRef({ options, onLoad, onError });
  latest.current = { options, onLoad, onError };
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const { options: current } = latest.current;
    loadScript({ ...current, src }).then(
      (script) => {
        if (!cancelled) latest.current.onLoad?.(script);
      },
      (error: Error) => {
        if (!cancelled) latest.current.onError?.(error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [allowed, src]);
  return null;
}

export type ConsentIframeProps = ConsentTarget &
  Omit<IframeHTMLAttributes<HTMLIFrameElement>, "src" | "title"> & {
    src: string;
    /** Required for accessibility. */
    title: string;
    /** Replaces the default placeholder. */
    placeholder?: ReactNode;
    placeholderClassName?: string;
    unstyled?: boolean;
  };

/**
 * An iframe (YouTube, Vimeo, Maps …) that only loads after consent.
 * The default placeholder offers "Load once" and "Always allow".
 */
export function ConsentIframe({
  category,
  service,
  src,
  title,
  placeholder,
  placeholderClassName,
  unstyled = false,
  ...iframeProps
}: ConsentIframeProps) {
  const { manager, config, t, theme } = usePermitoContext();
  const allowed = useIsAllowed(service ? { service } : { category: category as string });
  const [loadOnce, setLoadOnce] = useState(false);
  const c = (name: string) => (unstyled ? undefined : name);

  if (allowed || loadOnce) {
    return <iframe src={src} title={title} loading="lazy" {...iframeProps} />;
  }
  if (placeholder !== undefined) return <>{placeholder}</>;

  const serviceDefinition = service ? config.services?.find((s) => s.id === service) : undefined;
  const serviceName = serviceDefinition?.name ?? title;
  const provider = serviceDefinition?.provider ?? serviceName;

  const allowAlways = () =>
    service
      ? manager.setServiceConsent(service, true, "embed")
      : manager.update({ [category as string]: true }, { source: "embed" });

  return (
    <div
      className={cx(c("pmt-root pmt-embed"), placeholderClassName)}
      data-pmt-theme={theme}
      style={
        unstyled
          ? undefined
          : { width: iframeProps.width ?? "100%", minHeight: iframeProps.height ?? undefined }
      }
      data-permito="embed-placeholder"
    >
      <p className={c("pmt-title pmt-title--small")}>
        {format(t.embedTitle, { service: serviceName })}
      </p>
      <p className={c("pmt-text pmt-text--small")}>{format(t.embedDescription, { provider })}</p>
      <div className={c("pmt-actions")}>
        <button
          type="button"
          className={c("pmt-btn pmt-btn--secondary")}
          onClick={() => setLoadOnce(true)}
        >
          {t.embedLoadOnce}
        </button>
        <button type="button" className={c("pmt-btn pmt-btn--choice")} onClick={allowAlways}>
          {t.embedAlwaysAllow}
        </button>
      </div>
    </div>
  );
}

export interface PreferencesButtonProps {
  position?: "bottom-left" | "bottom-right";
  className?: string;
  unstyled?: boolean;
  /**
   * `true` (default) renders into the provider's `portalContainer` or `document.body`,
   * an element renders into that element, `false` renders in place.
   */
  portal?: PortalTarget;
}

/** Small floating button to reopen the preference center after a decision. */
export function PreferencesButton({
  position = "bottom-left",
  className,
  unstyled = false,
  portal = true,
}: PreferencesButtonProps) {
  const { snapshot, t, theme, preferencesOpen, openPreferences } = usePermitoContext();
  if (!snapshot.ready || snapshot.needsConsent || preferencesOpen) return null;
  const c = (name: string) => (unstyled ? undefined : name);
  return (
    <Portal target={portal}>
      <button
        type="button"
        className={cx(c("pmt-root pmt-fab"), c(`pmt-fab--${position}`), className)}
        data-pmt-theme={theme}
        onClick={openPreferences}
        aria-label={t.openPreferences}
        title={t.openPreferences}
        data-permito="preferences-button"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Zm-4.5 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-1-8a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"
          />
        </svg>
      </button>
    </Portal>
  );
}
