import { type ReactNode, useEffect, useId, useRef } from "react";
import { usePermitoContext } from "./context";
import { Portal } from "./portal";
import { cx } from "./utils";

export type BannerPosition = "bottom" | "top" | "bottom-left" | "bottom-right" | "center";

export interface ConsentBannerProps {
  position?: BannerPosition;
  /** Move focus to the banner when it appears, so keyboard and screen reader users notice it. */
  autoFocus?: boolean;
  /** Hide the "Settings" button. The preference center then has to be reachable elsewhere. */
  hideCustomize?: boolean;
  /** Overrides the provider's privacy policy URL. */
  privacyPolicyUrl?: string;
  className?: string;
  /** Omit the default classes and styles entirely (headless styling). */
  unstyled?: boolean;
  /** Extra content between the description and the buttons. */
  children?: ReactNode;
  /** Render into `document.body`. Defaults to `true`. */
  portal?: boolean;
}

/**
 * The first-layer banner. Rendered only on the client once no valid decision exists.
 * "Accept all" and "Reject all" are always shown with identical styling.
 */
export function ConsentBanner({
  position = "bottom",
  autoFocus = true,
  hideCustomize = false,
  privacyPolicyUrl,
  className,
  unstyled = false,
  children,
  portal = true,
}: ConsentBannerProps) {
  const context = usePermitoContext();
  const { manager, snapshot, t, preferencesOpen, openPreferences } = context;
  const titleId = useId();
  const descriptionId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const visible = snapshot.needsConsent && !preferencesOpen;
  const policyUrl = privacyPolicyUrl ?? context.privacyPolicyUrl;

  useEffect(() => {
    if (visible && autoFocus) ref.current?.focus();
  }, [visible, autoFocus]);

  if (!visible) return null;

  const c = (name: string) => (unstyled ? undefined : name);

  return (
    <Portal enabled={portal}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cx(c("pmt-root pmt-banner"), c(`pmt-banner--${position}`), className)}
        data-permito="banner"
      >
        <div className={c("pmt-banner__body")}>
          <h2 id={titleId} className={c("pmt-title")}>
            {t.bannerTitle}
          </h2>
          <p id={descriptionId} className={c("pmt-text")}>
            {t.bannerDescription}
            {policyUrl ? (
              <>
                {" "}
                <a className={c("pmt-link")} href={policyUrl}>
                  {t.privacyPolicy}
                </a>
              </>
            ) : null}
            {context.imprintUrl ? (
              <>
                {" · "}
                <a className={c("pmt-link")} href={context.imprintUrl}>
                  {t.imprint}
                </a>
              </>
            ) : null}
          </p>
          {children}
        </div>
        <div className={c("pmt-actions")}>
          {hideCustomize ? null : (
            <button
              type="button"
              className={c("pmt-btn pmt-btn--secondary")}
              onClick={openPreferences}
            >
              {t.customize}
            </button>
          )}
          <button
            type="button"
            className={c("pmt-btn pmt-btn--choice")}
            onClick={() => manager.rejectAll("banner")}
          >
            {t.rejectAll}
          </button>
          <button
            type="button"
            className={c("pmt-btn pmt-btn--choice")}
            onClick={() => manager.acceptAll("banner")}
          >
            {t.acceptAll}
          </button>
        </div>
      </div>
    </Portal>
  );
}
