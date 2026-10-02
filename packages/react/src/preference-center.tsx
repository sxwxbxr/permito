import { type ConsentService, localize } from "@permito/core";
import { useCallback, useId, useRef, useState } from "react";
import { usePermitoContext } from "./context";
import { useModalFocus } from "./focus";
import { Portal, type PortalTarget } from "./portal";
import { cx } from "./utils";

export interface PreferenceCenterProps {
  className?: string;
  unstyled?: boolean;
  /** Show per-service switches inside each category. Defaults to `true`. */
  serviceToggles?: boolean;
  /**
   * `true` (default) renders into the provider's `portalContainer` or `document.body`,
   * an element renders into that element, `false` renders in place.
   */
  portal?: PortalTarget;
}

interface Draft {
  categories: Record<string, boolean>;
  services: Record<string, boolean>;
}

/**
 * Modal dialog to grant or decline individual categories and services.
 * Opens via `openPreferences()` (banner "Settings", `<PreferencesButton>`, or your own link).
 */
export function PreferenceCenter(props: PreferenceCenterProps) {
  const { preferencesOpen } = usePermitoContext();
  if (!preferencesOpen) return null;
  return <PreferenceDialog {...props} />;
}

function PreferenceDialog({
  className,
  unstyled = false,
  serviceToggles = true,
  portal = true,
}: PreferenceCenterProps) {
  const { manager, snapshot, config, t, language, closePreferences, privacyPolicyUrl, theme } =
    usePermitoContext();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const baseId = useId();
  const c = (name: string) => (unstyled ? undefined : name);
  const services = config.services ?? [];

  const [draft, setDraft] = useState<Draft>(() => ({
    categories: { ...snapshot.categories },
    services: { ...(snapshot.decision?.services ?? {}) },
  }));

  const close = useCallback(() => closePreferences(), [closePreferences]);
  useModalFocus(ref, true, close);

  const finish = async (action: () => Promise<void>) => {
    await action();
    closePreferences();
  };

  const toggleCategory = (id: string, value: boolean) => {
    setDraft((current) => {
      const nextServices = { ...current.services };
      for (const service of services) {
        if (service.category === id) delete nextServices[service.id];
      }
      return { categories: { ...current.categories, [id]: value }, services: nextServices };
    });
  };

  const toggleService = (service: ConsentService, value: boolean) => {
    setDraft((current) => ({
      ...current,
      services: { ...current.services, [service.id]: value },
    }));
  };

  const serviceValue = (service: ConsentService) =>
    service.requiresConsent === false ||
    (draft.services[service.id] ?? draft.categories[service.category] === true);

  return (
    <Portal target={portal}>
      <div className={c("pmt-root pmt-overlay")} data-permito="overlay" data-pmt-theme={theme}>
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={cx(c("pmt-dialog"), className)}
          data-permito="preferences"
        >
          <div className={c("pmt-dialog__header")}>
            <h2 id={titleId} className={c("pmt-title")}>
              {t.preferencesTitle}
            </h2>
            <button type="button" className={c("pmt-close")} onClick={close} aria-label={t.close}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className={c("pmt-dialog__content")}>
            <p id={descriptionId} className={c("pmt-text")}>
              {t.preferencesDescription}
              {privacyPolicyUrl ? (
                <>
                  {" "}
                  <a className={c("pmt-link")} href={privacyPolicyUrl}>
                    {t.privacyPolicy}
                  </a>
                </>
              ) : null}
            </p>
            <ul className={c("pmt-categories")}>
              {config.categories.map((category) => {
                const builtIn = t.categories[category.id];
                const name = localize(category.name, language) || builtIn?.name || category.id;
                const description =
                  localize(category.description, language) || builtIn?.description || "";
                const inputId = `${baseId}-${category.id}`;
                const categoryServices = services.filter((s) => s.category === category.id);
                return (
                  <li key={category.id} className={c("pmt-category")}>
                    <div className={c("pmt-category__header")}>
                      <label htmlFor={inputId} className={c("pmt-category__name")}>
                        {name}
                      </label>
                      {category.required ? (
                        <span className={c("pmt-badge")}>
                          <input
                            id={inputId}
                            type="checkbox"
                            role="switch"
                            checked
                            aria-checked="true"
                            disabled
                            aria-describedby={`${inputId}-desc`}
                            className={c("pmt-switch")}
                          />
                          <span>{t.alwaysActive}</span>
                        </span>
                      ) : (
                        <input
                          id={inputId}
                          type="checkbox"
                          role="switch"
                          checked={draft.categories[category.id] === true}
                          aria-checked={draft.categories[category.id] === true}
                          onChange={(event) => toggleCategory(category.id, event.target.checked)}
                          aria-describedby={`${inputId}-desc`}
                          className={c("pmt-switch")}
                        />
                      )}
                    </div>
                    <p id={`${inputId}-desc`} className={c("pmt-text pmt-text--small")}>
                      {description}
                    </p>
                    {categoryServices.length > 0 ? (
                      <details className={c("pmt-services")}>
                        <summary>
                          {t.services} ({categoryServices.length})
                        </summary>
                        <ul>
                          {categoryServices.map((service) => (
                            <ServiceItem
                              key={service.id}
                              service={service}
                              inputId={`${baseId}-service-${service.id}`}
                              checked={serviceValue(service)}
                              disabled={
                                category.required === true || service.requiresConsent === false
                              }
                              showToggle={serviceToggles}
                              onChange={(value) => toggleService(service, value)}
                              unstyled={unstyled}
                            />
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className={c("pmt-actions")}>
            <button
              type="button"
              className={c("pmt-btn pmt-btn--secondary")}
              onClick={() =>
                finish(() =>
                  manager.update(draft.categories, {
                    services: draft.services,
                    source: "preferences",
                  }),
                )
              }
            >
              {t.save}
            </button>
            <button
              type="button"
              className={c("pmt-btn pmt-btn--choice")}
              onClick={() => finish(() => manager.rejectAll("preferences"))}
            >
              {t.rejectAll}
            </button>
            <button
              type="button"
              className={c("pmt-btn pmt-btn--choice")}
              onClick={() => finish(() => manager.acceptAll("preferences"))}
            >
              {t.acceptAll}
            </button>
          </div>
          <p className={c("pmt-version")}>Version {config.consentVersion}</p>
        </div>
      </div>
    </Portal>
  );
}

interface ServiceItemProps {
  service: ConsentService;
  inputId: string;
  checked: boolean;
  disabled: boolean;
  showToggle: boolean;
  onChange: (value: boolean) => void;
  unstyled: boolean;
}

function ServiceItem({
  service,
  inputId,
  checked,
  disabled,
  showToggle,
  onChange,
  unstyled,
}: ServiceItemProps) {
  const { t, language } = usePermitoContext();
  const c = (name: string) => (unstyled ? undefined : name);
  const purpose = localize(service.purpose, language);
  return (
    <li className={c("pmt-service")}>
      <div className={c("pmt-category__header")}>
        <label htmlFor={inputId} className={c("pmt-service__name")}>
          {service.name}
        </label>
        {showToggle ? (
          <input
            id={inputId}
            type="checkbox"
            role="switch"
            checked={checked}
            aria-checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className={c("pmt-switch pmt-switch--small")}
          />
        ) : null}
      </div>
      <dl className={c("pmt-service__details")}>
        {service.provider ? (
          <>
            <dt>{t.provider}</dt>
            <dd>{service.provider}</dd>
          </>
        ) : null}
        {purpose ? (
          <>
            <dt>{t.purpose}</dt>
            <dd>{purpose}</dd>
          </>
        ) : null}
        {service.cookies && service.cookies.length > 0 ? (
          <>
            <dt>{t.cookies}</dt>
            <dd>
              {service.cookies
                .map((cookie) => {
                  const duration = localize(cookie.duration, language);
                  return duration ? `${cookie.name} (${t.duration}: ${duration})` : cookie.name;
                })
                .join(", ")}
            </dd>
          </>
        ) : null}
      </dl>
      {service.privacyPolicyUrl ? (
        <a
          className={c("pmt-link")}
          href={service.privacyPolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.privacyPolicy}: {service.name}
        </a>
      ) : null}
    </li>
  );
}
