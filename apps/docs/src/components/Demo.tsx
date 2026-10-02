import "@permito/react/styles.css";
import {
  ConsentBanner,
  ConsentGate,
  ConsentIframe,
  createMemoryStorage,
  PermitoProvider,
  PreferenceCenter,
  useConsent,
} from "@permito/react";
import { useState } from "react";

const languages = ["de-CH", "de", "en", "fr", "it"] as const;

function Controls({ onRestart }: { onRestart: () => void }) {
  const { categories, decision, openPreferences } = useConsent();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={openPreferences}>
          Open preference center
        </button>
        <button type="button" onClick={onRestart}>
          Restart demo
        </button>
      </div>
      <ConsentGate category="statistics" fallback={<p>📉 Statistics: blocked</p>}>
        <p>📈 Statistics: allowed (an analytics script could load now)</p>
      </ConsentGate>
      <ConsentIframe
        service="youtube"
        src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ"
        title="Demo video"
        width={480}
        height={270}
      />
      <details>
        <summary>Stored decision</summary>
        <pre style={{ fontSize: 12 }}>{JSON.stringify(decision ?? { categories }, null, 2)}</pre>
      </details>
    </div>
  );
}

/** Live demo. Uses memory storage so it never writes cookies on the docs site. */
export default function Demo() {
  const [language, setLanguage] = useState<(typeof languages)[number]>("de-CH");
  const [run, setRun] = useState(0);
  return (
    <div className="not-content" style={{ display: "grid", gap: 16 }}>
      <label>
        Language:{" "}
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as (typeof languages)[number])}
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <PermitoProvider
        key={`${language}-${run}`}
        config={{
          consentVersion: "demo",
          language,
          storage: createMemoryStorage(),
          categories: [
            { id: "necessary", required: true },
            { id: "statistics" },
            { id: "marketing" },
          ],
          services: [
            {
              id: "youtube",
              name: "YouTube",
              provider: "Google Ireland Ltd.",
              category: "marketing",
              purpose: { en: "Embed videos", de: "Videos einbetten" },
              privacyPolicyUrl: "https://policies.google.com/privacy",
            },
          ],
        }}
        privacyPolicyUrl="#"
      >
        <Controls onRestart={() => setRun((r) => r + 1)} />
        <ConsentBanner autoFocus={false} />
        <PreferenceCenter />
      </PermitoProvider>
    </div>
  );
}
