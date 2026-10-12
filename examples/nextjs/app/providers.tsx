"use client";

import {
  ConsentBanner,
  type ConsentState,
  type ConsentStateV1,
  PermitoProvider,
  PreferenceCenter,
  PreferencesButton,
} from "@permitojs/react";
import type { ReactNode } from "react";
import { categories, consentVersion, services } from "./consent";

export function Providers({
  initialState,
  children,
}: {
  initialState: ConsentState | ConsentStateV1 | null;
  children: ReactNode;
}) {
  return (
    <PermitoProvider
      config={{ consentVersion, categories, services, language: "de-CH", initialState }}
      privacyPolicyUrl="/datenschutz"
      googleConsentMode
    >
      {children}
      <ConsentBanner />
      <PreferenceCenter />
      <PreferencesButton />
    </PermitoProvider>
  );
}
