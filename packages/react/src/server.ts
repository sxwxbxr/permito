/**
 * Server-safe helpers (no "use client"), for Next.js server components, route handlers,
 * React Router loaders and plain Node.
 */
export {
  type ConsentModeDefaultOptions,
  type ConsentState,
  type ConsentStateV1,
  getConsentModeDefaultScript,
  getMatomoDefaultScript,
  getMicrosoftUetDefaultScript,
  isConsentState,
  parseConsentState,
  readConsentFromCookieHeader,
  readGpcFromHeaders,
} from "@permitojs/core";
