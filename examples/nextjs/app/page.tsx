import { ConsentGate, ConsentIframe, ConsentScript } from "@permito/react";

export default function Home() {
  return (
    <main
      style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}
    >
      <h1>Permito Beispiel</h1>
      <ConsentGate
        category="statistics"
        fallback={<p data-testid="stats">Statistik deaktiviert</p>}
      >
        <p data-testid="stats">Statistik aktiv</p>
      </ConsentGate>
      <ConsentScript
        service="plausible"
        src="https://plausible.io/js/script.js"
        defer
        attributes={{ "data-domain": "example.com" }}
      />
      <ConsentIframe
        service="youtube"
        src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        title="Beispielvideo"
        width={560}
        height={315}
      />
    </main>
  );
}
