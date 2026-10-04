"use client";

import {
  ConsentBanner,
  type ConsentState,
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
  initialState: ConsentState | null;
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
