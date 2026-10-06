import type { CategoryId, ConsentService } from "./types";

/*
 * Starting points for common services: name, provider, privacy policy and the category most
 * sites file the service under. They list no cookies and no durations on purpose; those change
 * and need a source. The operator decides the category and whether the service needs consent.
 */
type Template = Pick<ConsentService, "id" | "name" | "provider" | "privacyPolicyUrl"> & {
  category: CategoryId;
};

const GOOGLE = "https://policies.google.com/privacy";

const list: Template[] = [
  {
    id: "youtube",
    name: "YouTube",
    provider: "Google",
    privacyPolicyUrl: GOOGLE,
    category: "marketing",
  },
  {
    id: "vimeo",
    name: "Vimeo",
    provider: "Vimeo",
    privacyPolicyUrl: "https://vimeo.com/privacy",
    category: "marketing",
  },
  {
    id: "google-maps",
    name: "Google Maps",
    provider: "Google",
    privacyPolicyUrl: GOOGLE,
    category: "preferences",
  },
  {
    id: "google-analytics-4",
    name: "Google Analytics 4",
    provider: "Google",
    privacyPolicyUrl: GOOGLE,
    category: "statistics",
  },
  {
    id: "google-tag-manager",
    name: "Google Tag Manager",
    provider: "Google",
    privacyPolicyUrl: GOOGLE,
    category: "statistics",
  },
  {
    id: "google-ads",
    name: "Google Ads",
    provider: "Google",
    privacyPolicyUrl: GOOGLE,
    category: "marketing",
  },
  {
    id: "recaptcha",
    name: "reCAPTCHA",
    provider: "Google",
    privacyPolicyUrl: GOOGLE,
    category: "security",
  },
  {
    id: "meta-pixel",
    name: "Meta Pixel",
    provider: "Meta",
    privacyPolicyUrl: "https://www.facebook.com/privacy/policy/",
    category: "marketing",
  },
  {
    id: "linkedin-insight",
    name: "LinkedIn Insight Tag",
    provider: "LinkedIn",
    privacyPolicyUrl: "https://www.linkedin.com/legal/privacy-policy",
    category: "marketing",
  },
  {
    id: "microsoft-clarity",
    name: "Microsoft Clarity",
    provider: "Microsoft",
    privacyPolicyUrl: "https://privacy.microsoft.com/privacystatement",
    category: "statistics",
  },
  {
    id: "microsoft-advertising",
    name: "Microsoft Advertising",
    provider: "Microsoft",
    privacyPolicyUrl: "https://privacy.microsoft.com/privacystatement",
    category: "marketing",
  },
  {
    id: "hotjar",
    name: "Hotjar",
    provider: "Hotjar",
    privacyPolicyUrl: "https://www.hotjar.com/privacy/",
    category: "statistics",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    provider: "HubSpot",
    privacyPolicyUrl: "https://legal.hubspot.com/privacy-policy",
    category: "marketing",
  },
  {
    id: "pinterest-tag",
    name: "Pinterest Tag",
    provider: "Pinterest",
    privacyPolicyUrl: "https://policy.pinterest.com/en/privacy-policy",
    category: "marketing",
  },
  {
    id: "spotify",
    name: "Spotify",
    provider: "Spotify",
    privacyPolicyUrl: "https://www.spotify.com/legal/privacy-policy/",
    category: "marketing",
  },
];

export const serviceTemplates: Readonly<Record<string, Readonly<ConsentService>>> = Object.freeze(
  Object.fromEntries(list.map((template) => [template.id, Object.freeze({ ...template })])),
);

/**
 * Copies a template for use in `config.services`. Overrides win, so you can change the category
 * or add cookies and purpose. Throws for an unknown id.
 */
export function serviceFromTemplate(
  id: string,
  overrides: Partial<Omit<ConsentService, "id">> = {},
): ConsentService {
  const template = serviceTemplates[id];
  if (!template) {
    throw new Error(
      `Unknown service template "${id}". Available: ${Object.keys(serviceTemplates).join(", ")}.`,
    );
  }
  return { ...template, ...overrides };
}
