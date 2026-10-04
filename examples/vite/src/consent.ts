import type { ConsentConfig } from "@permitojs/react";

export const consentConfig: ConsentConfig = {
  consentVersion: "2026-10",
  language: navigator.language.startsWith("fr")
    ? "fr"
    : navigator.language.startsWith("it")
      ? "it"
      : "de-CH",
  categories: [
    { id: "necessary", required: true },
    { id: "preferences" },
    { id: "statistics" },
    { id: "marketing" },
  ],
  services: [
    {
      id: "vimeo",
      name: "Vimeo",
      provider: "Vimeo.com, Inc.",
      category: "marketing",
      purpose: { de: "Videos einbetten", en: "Embed videos" },
      privacyPolicyUrl: "https://vimeo.com/privacy",
    },
  ],
};
