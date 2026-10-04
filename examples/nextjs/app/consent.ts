import type { ConsentCategoryDefinition, ConsentService } from "@permitojs/react";

export const consentVersion = "2026-10";

export const categories: ConsentCategoryDefinition[] = [
  { id: "necessary", required: true },
  { id: "statistics" },
  { id: "marketing" },
];

export const services: ConsentService[] = [
  {
    id: "plausible",
    name: "Plausible Analytics",
    provider: "Plausible Insights OÜ",
    category: "statistics",
    purpose: { de: "Anonyme Besucherstatistik", en: "Anonymous visitor statistics" },
    privacyPolicyUrl: "https://plausible.io/privacy",
  },
  {
    id: "youtube",
    name: "YouTube",
    provider: "Google Ireland Ltd.",
    category: "marketing",
    purpose: { de: "Videos einbetten", en: "Embed videos" },
    cookies: [{ name: "VISITOR_INFO1_LIVE", duration: { de: "6 Monate", en: "6 months" } }],
    privacyPolicyUrl: "https://policies.google.com/privacy",
  },
];
