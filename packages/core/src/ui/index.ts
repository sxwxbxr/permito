import { type ConnectConsentModeOptions, connectGoogleConsentMode } from "../consent-mode";
import { getTranslations, localize, type TranslationOverrides, type Translations } from "../i18n";
import { type ConsentManager, createConsentManager } from "../manager";
import { type ActivateOptions, activateBlockedElements } from "../scripts";
import styles from "../styles.css";
import type { ConsentConfig, ConsentService } from "../types";
import { h, nextId, trapFocus } from "./dom";

export type ConsentUIPosition = "bottom" | "top" | "bottom-left" | "bottom-right" | "center";

export interface ConsentUIOptions {
  /** Consent configuration. Ignored when `manager` is given. */
  config?: ConsentConfig;
  /** Use an existing manager instead of creating one from `config`. */
  manager?: ConsentManager;
  translations?: TranslationOverrides;
  privacyPolicyUrl?: string;
  imprintUrl?: string;
  /** Force light or dark styling. Default: follow `prefers-color-scheme`. */
  theme?: "light" | "dark";
  /** Banner position. Default `"bottom"`. */
  position?: ConsentUIPosition;
  /** Hide the "Settings" button in the banner. */
  hideCustomize?: boolean;
  /** Floating button to reopen the settings after a decision. Default `"bottom-left"`, `false` hides it. */
  preferencesButton?: "bottom-left" | "bottom-right" | false;
  /** Per-service switches in the preference center. Default `true`. */
  serviceToggles?: boolean;
  /** Where the UI is rendered. Default `document.body`. */
  container?: Element;
  /** Send Google Consent Mode v2 updates. Render the default snippet in `<head>` yourself. */
  googleConsentMode?: boolean | ConnectConsentModeOptions;
  /** Activate `<script type="text/plain" data-consent-…>` markup after consent. Default `true`. */
  blockedElements?: boolean | ActivateOptions;
  /** Insert the default stylesheet as a `<style>` element. Default `true`. */
  injectStyles?: boolean;
  /** CSP nonce for the injected `<style>` element. */
  styleNonce?: string;
  /** Move focus to the banner when it appears. Default `true`. */
  autoFocus?: boolean;
}

export interface ConsentUI {
  readonly manager: ConsentManager;
  openPreferences(): void;
  closePreferences(): void;
  /** Removes the UI, listeners and integrations. Stored consent is kept. */
  destroy(): void;
}

const STYLE_ID = "permito-styles";

const PREFERENCES_ICON =
  "M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Zm-4.5 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-1-8a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z";

/**
 * Banner, preference center and settings button without a framework, built on the same
 * engine, texts and stylesheet as `@permitojs/react`. Works on WordPress, Webflow, Astro
 * or plain HTML. "Accept all" and "Reject all" always have identical styling.
 */
export function createConsentUI(options: ConsentUIOptions): ConsentUI {
  if (!options.manager && !options.config) {
    throw new Error("createConsentUI: pass `config` or `manager`.");
  }
  const manager = options.manager ?? createConsentManager(options.config as ConsentConfig);
  const config = manager.config;
  const language = config.language;
  const t: Translations = getTranslations(language, options.translations);
  const container = options.container ?? document.body;
  const position = options.position ?? "bottom";
  const fabPosition = options.preferencesButton ?? "bottom-left";
  const cleanups: Array<() => void> = [];

  if (options.injectStyles !== false && styles && !document.getElementById(STYLE_ID)) {
    const style = h("style", { id: STYLE_ID, nonce: options.styleNonce }, [styles]);
    document.head.append(style);
    cleanups.push(() => style.remove());
  }

  if (options.googleConsentMode) {
    cleanups.push(
      connectGoogleConsentMode(
        manager,
        options.googleConsentMode === true ? {} : options.googleConsentMode,
      ),
    );
  }
  if (options.blockedElements !== false) {
    cleanups.push(
      activateBlockedElements(
        manager,
        options.blockedElements === true || options.blockedElements === undefined
          ? {}
          : options.blockedElements,
      ),
    );
  }

  const themed = (attributes: Record<string, string | boolean | undefined>) => ({
    ...attributes,
    "data-pmt-theme": options.theme,
  });

  const link = (href: string, text: string) => h("a", { class: "pmt-link", href }, [text]);

  let banner: HTMLElement | null = null;
  let fab: HTMLElement | null = null;
  let overlay: HTMLElement | null = null;
  let releaseFocus: (() => void) | null = null;

  const button = (label: string, variant: "secondary" | "choice", onClick: () => void) => {
    const element = h("button", { type: "button", class: `pmt-btn pmt-btn--${variant}` }, [label]);
    element.addEventListener("click", onClick);
    return element;
  };

  const renderBanner = () => {
    const titleId = nextId("pmt-banner-title");
    const descriptionId = nextId("pmt-banner-desc");
    const policy = options.privacyPolicyUrl;
    const element = h(
      "div",
      themed({
        role: "dialog",
        "aria-modal": "false",
        "aria-labelledby": titleId,
        "aria-describedby": descriptionId,
        tabindex: "-1",
        class: `pmt-root pmt-banner pmt-banner--${position}`,
        "data-permito": "banner",
      }),
      [
        h("div", { class: "pmt-banner__body" }, [
          h("h2", { id: titleId, class: "pmt-title" }, [t.bannerTitle]),
          h("p", { id: descriptionId, class: "pmt-text" }, [
            t.bannerDescription,
            policy ? " " : null,
            policy ? link(policy, t.privacyPolicy) : null,
            options.imprintUrl ? " · " : null,
            options.imprintUrl ? link(options.imprintUrl, t.imprint) : null,
          ]),
        ]),
        h("div", { class: "pmt-actions" }, [
          options.hideCustomize ? null : button(t.customize, "secondary", openPreferences),
          button(t.rejectAll, "choice", () => void manager.rejectAll("banner")),
          button(t.acceptAll, "choice", () => void manager.acceptAll("banner")),
        ]),
      ],
    );
    return element;
  };

  const renderFab = () => {
    const element = h(
      "button",
      themed({
        type: "button",
        class: `pmt-root pmt-fab pmt-fab--${fabPosition}`,
        "aria-label": t.openPreferences,
        title: t.openPreferences,
        "data-permito": "preferences-button",
      }),
    );
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "22");
    svg.setAttribute("height", "22");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", PREFERENCES_ICON);
    svg.append(path);
    element.append(svg);
    element.addEventListener("click", openPreferences);
    return element;
  };

  const renderPreferences = () => {
    const snapshot = manager.getSnapshot();
    const services = config.services ?? [];
    const serviceToggles = options.serviceToggles !== false;
    const draft = {
      categories: { ...snapshot.categories } as Record<string, boolean>,
      services: { ...(snapshot.decision?.services ?? {}) } as Record<string, boolean>,
    };
    const serviceInputs = new Map<string, HTMLInputElement>();
    const serviceValue = (service: ConsentService) =>
      service.requiresConsent === false ||
      (draft.services[service.id] ?? draft.categories[service.category] === true);
    const syncServiceInputs = () => {
      for (const service of services) {
        const input = serviceInputs.get(service.id);
        if (input) {
          input.checked = serviceValue(service);
          input.setAttribute("aria-checked", String(input.checked));
        }
      }
    };

    const titleId = nextId("pmt-pref-title");
    const descriptionId = nextId("pmt-pref-desc");
    const baseId = nextId("pmt-pref");

    const switchInput = (id: string, checked: boolean, extra: Record<string, string | boolean>) => {
      const input = h("input", {
        id,
        type: "checkbox",
        role: "switch",
        "aria-checked": String(checked),
        ...extra,
      }) as HTMLInputElement;
      input.checked = checked;
      return input;
    };

    const categoryItems = config.categories.map((category) => {
      const builtIn = t.categories[category.id];
      const name = localize(category.name, language) || builtIn?.name || category.id;
      const description = localize(category.description, language) || builtIn?.description || "";
      const inputId = `${baseId}-${category.id}`;
      const categoryServices = services.filter((s) => s.category === category.id);

      let control: HTMLElement;
      if (category.required) {
        control = h("span", { class: "pmt-badge" }, [
          switchInput(inputId, true, {
            disabled: true,
            "aria-describedby": `${inputId}-desc`,
            class: "pmt-switch",
          }),
          h("span", {}, [t.alwaysActive]),
        ]);
      } else {
        const input = switchInput(inputId, draft.categories[category.id] === true, {
          "aria-describedby": `${inputId}-desc`,
          class: "pmt-switch",
        });
        input.addEventListener("change", () => {
          input.setAttribute("aria-checked", String(input.checked));
          draft.categories[category.id] = input.checked;
          for (const service of categoryServices) delete draft.services[service.id];
          syncServiceInputs();
        });
        control = input;
      }

      const serviceList = categoryServices.length
        ? h("details", { class: "pmt-services" }, [
            h("summary", {}, [`${t.services} (${categoryServices.length})`]),
            h(
              "ul",
              {},
              categoryServices.map((service) => {
                const serviceId = `${baseId}-service-${service.id}`;
                let toggle: HTMLInputElement | null = null;
                if (serviceToggles) {
                  toggle = switchInput(serviceId, serviceValue(service), {
                    disabled: category.required === true || service.requiresConsent === false,
                    class: "pmt-switch pmt-switch--small",
                  });
                  const input = toggle;
                  input.addEventListener("change", () => {
                    input.setAttribute("aria-checked", String(input.checked));
                    draft.services[service.id] = input.checked;
                  });
                  serviceInputs.set(service.id, input);
                }
                const purpose = localize(service.purpose, language);
                const cookies = (service.cookies ?? [])
                  .map((cookie) => {
                    const duration = localize(cookie.duration, language);
                    return duration ? `${cookie.name} (${t.duration}: ${duration})` : cookie.name;
                  })
                  .join(", ");
                return h("li", { class: "pmt-service" }, [
                  h("div", { class: "pmt-category__header" }, [
                    h("label", { for: serviceId, class: "pmt-service__name" }, [service.name]),
                    toggle,
                  ]),
                  h("dl", { class: "pmt-service__details" }, [
                    ...(service.provider
                      ? [h("dt", {}, [t.provider]), h("dd", {}, [service.provider])]
                      : []),
                    ...(purpose ? [h("dt", {}, [t.purpose]), h("dd", {}, [purpose])] : []),
                    ...(cookies ? [h("dt", {}, [t.cookies]), h("dd", {}, [cookies])] : []),
                  ]),
                  service.privacyPolicyUrl
                    ? h(
                        "a",
                        {
                          class: "pmt-link",
                          href: service.privacyPolicyUrl,
                          target: "_blank",
                          rel: "noopener noreferrer",
                        },
                        [`${t.privacyPolicy}: ${service.name}`],
                      )
                    : null,
                ]);
              }),
            ),
          ])
        : null;

      return h("li", { class: "pmt-category" }, [
        h("div", { class: "pmt-category__header" }, [
          h("label", { for: inputId, class: "pmt-category__name" }, [name]),
          control,
        ]),
        h("p", { id: `${inputId}-desc`, class: "pmt-text pmt-text--small" }, [description]),
        serviceList,
      ]);
    });

    const finish = (action: () => Promise<void>) => {
      void action().then(closePreferences);
    };

    const closeButton = h("button", { type: "button", class: "pmt-close", "aria-label": t.close }, [
      h("span", { "aria-hidden": "true" }, ["×"]),
    ]);
    closeButton.addEventListener("click", closePreferences);

    const dialog = h(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "aria-describedby": descriptionId,
        tabindex: "-1",
        class: "pmt-dialog",
        "data-permito": "preferences",
      },
      [
        h("div", { class: "pmt-dialog__header" }, [
          h("h2", { id: titleId, class: "pmt-title" }, [t.preferencesTitle]),
          closeButton,
        ]),
        h("div", { class: "pmt-dialog__content" }, [
          h("p", { id: descriptionId, class: "pmt-text" }, [
            t.preferencesDescription,
            options.privacyPolicyUrl ? " " : null,
            options.privacyPolicyUrl ? link(options.privacyPolicyUrl, t.privacyPolicy) : null,
          ]),
          h("ul", { class: "pmt-categories" }, categoryItems),
        ]),
        h("div", { class: "pmt-actions" }, [
          button(t.save, "secondary", () =>
            finish(() =>
              manager.update(draft.categories, {
                services: draft.services,
                source: "preferences",
              }),
            ),
          ),
          button(t.rejectAll, "choice", () => finish(() => manager.rejectAll("preferences"))),
          button(t.acceptAll, "choice", () => finish(() => manager.acceptAll("preferences"))),
        ]),
        h("p", { class: "pmt-version" }, [`Version ${config.consentVersion}`]),
      ],
    );

    return {
      overlay: h("div", themed({ class: "pmt-root pmt-overlay", "data-permito": "overlay" }), [
        dialog,
      ]),
      dialog,
    };
  };

  let preferencesOpen = false;

  const update = () => {
    const snapshot = manager.getSnapshot();
    const showBanner = snapshot.needsConsent && !preferencesOpen;
    if (showBanner && !banner) {
      banner = renderBanner();
      container.append(banner);
      if (options.autoFocus !== false) banner.focus();
    } else if (!showBanner && banner) {
      banner.remove();
      banner = null;
    }
    const showFab =
      fabPosition !== false && snapshot.ready && !snapshot.needsConsent && !preferencesOpen;
    if (showFab && !fab) {
      fab = renderFab();
      container.append(fab);
    } else if (!showFab && fab) {
      fab.remove();
      fab = null;
    }
  };

  function openPreferences() {
    if (preferencesOpen) return;
    preferencesOpen = true;
    update();
    const rendered = renderPreferences();
    overlay = rendered.overlay;
    container.append(overlay);
    releaseFocus = trapFocus(rendered.dialog, closePreferences);
  }

  function closePreferences() {
    if (!preferencesOpen) return;
    preferencesOpen = false;
    overlay?.remove();
    overlay = null;
    const release = releaseFocus;
    releaseFocus = null;
    update();
    release?.();
  }

  // Any element with data-permito-open (e.g. a footer link) opens the settings.
  const onDocumentClick = (event: Event) => {
    const target = event.target as Element | null;
    if (target?.closest?.("[data-permito-open]")) {
      event.preventDefault();
      openPreferences();
    }
  };
  document.addEventListener("click", onDocumentClick);
  cleanups.push(() => document.removeEventListener("click", onDocumentClick));

  cleanups.push(manager.subscribe(update));
  update();
  void manager.ready.then(update);

  return {
    manager,
    openPreferences,
    closePreferences,
    destroy() {
      closePreferences();
      banner?.remove();
      fab?.remove();
      banner = null;
      fab = null;
      for (const cleanup of cleanups.splice(0)) cleanup();
      if (!options.manager) manager.destroy();
    },
  };
}
