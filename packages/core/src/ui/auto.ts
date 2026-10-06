/**
 * Script-tag build (`dist/permito.global.js`). Exposes `window.Permito` and starts the UI from
 * a JSON config, so sites without a bundler (WordPress, Webflow, static HTML) can use Permito:
 *
 *   <script type="application/json" id="permito-config">{ "config": { … }, "privacyPolicyUrl": "/datenschutz" }</script>
 *   <script src="…/permito.global.js" data-config="#permito-config"></script>
 */

import { pushIntegrationDefaults } from "../bridges";
import {
  type ConsentModeDefaultOptions,
  DEFAULT_CONSENT_MODE_MAPPING,
  type GoogleConsentValue,
} from "../consent-mode";
import { createConsentManager } from "../manager";
import { type ConsentUI, type ConsentUIOptions, createConsentUI } from "./index";

export interface AutoOptions extends ConsentUIOptions {
  /**
   * Push the Google Consent Mode default ("denied") right away. Load the script without
   * `defer`/`async` in `<head>`, before the Google tag, for this to take effect in time.
   */
  consentModeDefault?: boolean | ConsentModeDefaultOptions;
}

type GtagWindow = Window & Record<string, unknown>;

function pushConsentDefault(options: ConsentModeDefaultOptions) {
  const mapping = options.mapping ?? DEFAULT_CONSENT_MODE_MAPPING;
  const granted = new Set<string>(options.grantedByDefault ?? ["security_storage"]);
  const defaults: Record<string, GoogleConsentValue | number> = {};
  for (const type of Object.keys(mapping))
    defaults[type] = granted.has(type) ? "granted" : "denied";
  defaults.wait_for_update = options.waitForUpdate ?? 500;
  const name = options.dataLayerName ?? "dataLayer";
  const w = window as unknown as GtagWindow;
  if (!Array.isArray(w[name])) w[name] = [];
  const layer = w[name] as unknown[];
  // gtag() pushes its `arguments` object; Google's tag only accepts that shape.
  (function gtag(..._args: unknown[]) {
    // biome-ignore lint/complexity/noArguments: gtag requires the arguments object
    layer.push(arguments);
  })("consent", "default", defaults);
}

let instance: ConsentUI | null = null;

function init(options: AutoOptions): ConsentUI {
  instance?.destroy();
  const { consentModeDefault, ...uiOptions } = options;
  if (consentModeDefault) pushConsentDefault(consentModeDefault === true ? {} : consentModeDefault);
  // UET and Matomo wait for consent; this must happen before their tags run.
  pushIntegrationDefaults(uiOptions);
  // Create the manager now (reads the cookie synchronously), render once the body exists.
  const manager = uiOptions.manager ?? createConsentManager(uiOptions.config as never);
  const start = () => {
    instance = createConsentUI({ ...uiOptions, manager });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
  return {
    manager,
    openPreferences: () => instance?.openPreferences(),
    closePreferences: () => instance?.closePreferences(),
    destroy: () => {
      instance?.destroy();
      instance = null;
      manager.destroy();
    },
  };
}

function readConfig(selector: string): AutoOptions | null {
  const source = document.querySelector(selector);
  if (!source?.textContent) {
    console.error(`Permito: no config found at "${selector}".`);
    return null;
  }
  try {
    return JSON.parse(source.textContent) as AutoOptions;
  } catch (error) {
    console.error("Permito: the config is not valid JSON.", error);
    return null;
  }
}

const api = {
  init,
  open: () => instance?.openPreferences(),
  close: () => instance?.closePreferences(),
  get manager() {
    return instance?.manager ?? null;
  },
};

(window as unknown as { Permito: typeof api }).Permito = api;

const selector = (document.currentScript as HTMLScriptElement | null)?.dataset.config;
if (selector) {
  // The config element should come first; if it follows the script, wait for the document.
  if (document.querySelector(selector) || document.readyState !== "loading") {
    const auto = readConfig(selector);
    if (auto) init(auto);
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        const auto = readConfig(selector);
        if (auto) init(auto);
      },
      { once: true },
    );
  }
}
