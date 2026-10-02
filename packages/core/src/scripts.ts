import type { ConsentManager } from "./manager";

/** Allowlist entries: an origin/prefix string ("https://www.googletagmanager.com/") or a RegExp. */
export type UrlAllowlist = ReadonlyArray<string | RegExp>;

export function isUrlAllowed(src: string, allowlist?: UrlAllowlist): boolean {
  if (!allowlist) return true;
  return allowlist.some((entry) =>
    typeof entry === "string" ? src.startsWith(entry) : entry.test(src),
  );
}

export class BlockedUrlError extends Error {
  override name = "BlockedUrlError";
}

export interface LoadScriptOptions {
  src: string;
  id?: string;
  async?: boolean;
  defer?: boolean;
  nonce?: string;
  /** Additional attributes, e.g. `{ "data-domain": "example.com" }`. */
  attributes?: Record<string, string>;
  allowlist?: UrlAllowlist;
}

const loaded = new Map<string, Promise<HTMLScriptElement>>();

/**
 * Injects an external script once. Calling it again with the same `src` returns the same promise.
 * Only call this after consent was granted.
 */
export function loadScript(options: LoadScriptOptions): Promise<HTMLScriptElement> {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("loadScript can only run in the browser."));
  }
  if (!isUrlAllowed(options.src, options.allowlist)) {
    return Promise.reject(
      new BlockedUrlError(`Script URL is not in the allowlist: ${options.src}`),
    );
  }
  const key = options.id ?? options.src;
  const existing = loaded.get(key);
  if (existing) return existing;

  const promise = new Promise<HTMLScriptElement>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = options.src;
    script.async = options.async ?? true;
    if (options.defer) script.defer = true;
    if (options.id) script.id = options.id;
    if (options.nonce) script.nonce = options.nonce;
    for (const [name, value] of Object.entries(options.attributes ?? {})) {
      script.setAttribute(name, value);
    }
    script.setAttribute("data-permito", "loaded");
    script.addEventListener("load", () => resolve(script));
    script.addEventListener("error", () => {
      loaded.delete(key);
      script.remove();
      reject(new Error(`Failed to load script: ${options.src}`));
    });
    document.head.appendChild(script);
  });
  loaded.set(key, promise);
  return promise;
}

/** Test helper: forget which scripts were loaded. */
export function resetLoadedScripts(): void {
  loaded.clear();
}

export interface ActivateOptions {
  root?: ParentNode;
  allowlist?: UrlAllowlist;
  /** Nonce applied to activated scripts (needed with a strict CSP). */
  nonce?: string;
}

const BLOCKED_SELECTOR =
  'script[type="text/plain"][data-consent-category]:not([data-permito-activated]),' +
  'script[type="text/plain"][data-consent-service]:not([data-permito-activated]),' +
  "iframe[data-consent-src]:not([data-permito-activated])";

function isAllowed(manager: ConsentManager, element: Element): boolean {
  const service = element.getAttribute("data-consent-service");
  if (service) return manager.hasServiceConsent(service);
  const category = element.getAttribute("data-consent-category");
  return category ? manager.hasConsent(category) : false;
}

function activate(element: Element, options: ActivateOptions): void {
  element.setAttribute("data-permito-activated", "");
  const src = element.getAttribute("data-consent-src");
  if (src && !isUrlAllowed(src, options.allowlist)) {
    console.warn(`[permito] Blocked URL not in allowlist: ${src}`);
    return;
  }
  if (element instanceof HTMLIFrameElement) {
    if (src) element.src = src;
    return;
  }
  const script = document.createElement("script");
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name === "type" || attribute.name === "data-consent-src") continue;
    script.setAttribute(attribute.name, attribute.value);
  }
  const type = element.getAttribute("data-consent-type");
  if (type) script.type = type;
  const nonce = options.nonce ?? (element as HTMLScriptElement).nonce;
  if (nonce) script.nonce = nonce;
  if (src) script.src = src;
  else script.textContent = element.textContent;
  element.replaceWith(script);
}

/**
 * Activates markup-based blocked elements once consent allows them:
 *
 * ```html
 * <script type="text/plain" data-consent-category="statistics"
 *         data-consent-src="https://example.com/analytics.js"></script>
 * <iframe data-consent-service="youtube" data-consent-src="https://www.youtube-nocookie.com/embed/…"></iframe>
 * ```
 *
 * Returns a cleanup function. Revoking consent cannot unload code that already ran;
 * reload the page after a revocation if a script must stop.
 */
export function activateBlockedElements(
  manager: ConsentManager,
  options: ActivateOptions = {},
): () => void {
  if (typeof document === "undefined") return () => {};
  const run = () => {
    if (!manager.getSnapshot().ready) return;
    const root = options.root ?? document;
    for (const element of Array.from(root.querySelectorAll(BLOCKED_SELECTOR))) {
      if (isAllowed(manager, element)) activate(element, options);
    }
  };
  run();
  return manager.subscribe(run);
}
