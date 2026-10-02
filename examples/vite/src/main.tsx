import "@permito/react/styles.css";
import {
  ConsentBanner,
  ConsentGate,
  ConsentIframe,
  PermitoProvider,
  PreferenceCenter,
  PreferencesButton,
  useConsent,
} from "@permito/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { consentConfig } from "./consent";

function Status() {
  const { categories, openPreferences, resetConsent } = useConsent();
  return (
    <section>
      <h2>Aktueller Stand</h2>
      <pre>{JSON.stringify(categories, null, 2)}</pre>
      <button type="button" onClick={openPreferences}>
        Einstellungen öffnen
      </button>{" "}
      <button type="button" onClick={resetConsent}>
        Zustimmung widerrufen
      </button>
    </section>
  );
}

function App() {
  return (
    <main
      style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}
    >
      <h1>Permito mit Vite und React</h1>
      <ConsentGate category="preferences" fallback={<p>Präferenzen sind deaktiviert.</p>}>
        <p>Präferenzen sind aktiv, die Sprache könnte jetzt gespeichert werden.</p>
      </ConsentGate>
      <ConsentIframe
        service="vimeo"
        src="https://player.vimeo.com/video/76979871"
        title="Beispielvideo auf Vimeo"
        width={560}
        height={315}
      />
      <Status />
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

createRoot(root).render(
  <StrictMode>
    <PermitoProvider
      config={consentConfig}
      privacyPolicyUrl="/datenschutz"
      googleConsentMode
      blockedElements
    >
      <App />
      <ConsentBanner position="bottom-right" />
      <PreferenceCenter />
      <PreferencesButton />
    </PermitoProvider>
  </StrictMode>,
);
