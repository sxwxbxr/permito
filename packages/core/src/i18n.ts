import type { LocalizedText } from "./types";

export interface CategoryTexts {
  name: string;
  description: string;
}

export interface Translations {
  bannerTitle: string;
  bannerDescription: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
  privacyPolicy: string;
  imprint: string;
  preferencesTitle: string;
  preferencesDescription: string;
  save: string;
  close: string;
  alwaysActive: string;
  services: string;
  provider: string;
  purpose: string;
  cookies: string;
  duration: string;
  openPreferences: string;
  /** `{service}` is replaced with the service name. */
  embedTitle: string;
  /** `{provider}` is replaced with the provider name. */
  embedDescription: string;
  embedLoadOnce: string;
  embedAlwaysAllow: string;
  categories: Record<string, CategoryTexts>;
}

const de: Translations = {
  bannerTitle: "Ihre Privatsphäre",
  bannerDescription:
    "Wir verwenden Cookies und ähnliche Technologien. Einige sind für den Betrieb der Website notwendig, andere helfen uns, die Website zu verbessern oder Inhalte von Drittanbietern anzuzeigen. Sie entscheiden, welche Sie zulassen. Ihre Auswahl können Sie jederzeit ändern.",
  acceptAll: "Alle akzeptieren",
  rejectAll: "Alle ablehnen",
  customize: "Einstellungen",
  privacyPolicy: "Datenschutzerklärung",
  imprint: "Impressum",
  preferencesTitle: "Datenschutz-Einstellungen",
  preferencesDescription:
    "Wählen Sie, welche Kategorien Sie zulassen möchten. Notwendige Technologien sind immer aktiv.",
  save: "Auswahl speichern",
  close: "Schließen",
  alwaysActive: "Immer aktiv",
  services: "Dienste",
  provider: "Anbieter",
  purpose: "Zweck",
  cookies: "Cookies",
  duration: "Speicherdauer",
  openPreferences: "Datenschutz-Einstellungen öffnen",
  embedTitle: "{service} ist blockiert",
  embedDescription:
    "Dieser Inhalt wird von {provider} bereitgestellt. Wenn Sie ihn laden, werden Daten an {provider} übertragen.",
  embedLoadOnce: "Einmal laden",
  embedAlwaysAllow: "Immer erlauben",
  categories: {
    necessary: {
      name: "Notwendig",
      description:
        "Für grundlegende Funktionen der Website erforderlich, zum Beispiel um Ihre Auswahl zu speichern.",
    },
    preferences: {
      name: "Präferenzen",
      description:
        "Speichern Einstellungen wie Sprache oder Region, um die Website an Sie anzupassen.",
    },
    statistics: {
      name: "Statistik",
      description:
        "Helfen uns zu verstehen, wie die Website genutzt wird, damit wir sie verbessern können.",
    },
    marketing: {
      name: "Marketing",
      description: "Werden verwendet, um Werbung relevanter zu machen und deren Wirkung zu messen.",
    },
    security: {
      name: "Sicherheit",
      description: "Schützen die Website und Ihr Konto vor Missbrauch.",
    },
  },
};

const swissify = (value: string) => value.replace(/ß/g, "ss");

function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === "string") return fn(value) as T;
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)])) as T;
  }
  return value;
}

const en: Translations = {
  bannerTitle: "Your privacy",
  bannerDescription:
    "We use cookies and similar technologies. Some are necessary for the website to work, others help us improve it or show third-party content. You decide which ones to allow and can change your choice at any time.",
  acceptAll: "Accept all",
  rejectAll: "Reject all",
  customize: "Settings",
  privacyPolicy: "Privacy policy",
  imprint: "Imprint",
  preferencesTitle: "Privacy settings",
  preferencesDescription:
    "Choose which categories you want to allow. Necessary technologies are always active.",
  save: "Save selection",
  close: "Close",
  alwaysActive: "Always active",
  services: "Services",
  provider: "Provider",
  purpose: "Purpose",
  cookies: "Cookies",
  duration: "Duration",
  openPreferences: "Open privacy settings",
  embedTitle: "{service} is blocked",
  embedDescription:
    "This content is provided by {provider}. Loading it transfers data to {provider}.",
  embedLoadOnce: "Load once",
  embedAlwaysAllow: "Always allow",
  categories: {
    necessary: {
      name: "Necessary",
      description: "Required for basic website functions, for example to remember your choice.",
    },
    preferences: {
      name: "Preferences",
      description: "Remember settings such as language or region to tailor the website to you.",
    },
    statistics: {
      name: "Statistics",
      description: "Help us understand how the website is used so we can improve it.",
    },
    marketing: {
      name: "Marketing",
      description: "Used to make advertising more relevant and to measure its effectiveness.",
    },
    security: {
      name: "Security",
      description: "Protect the website and your account against abuse.",
    },
  },
};

const fr: Translations = {
  bannerTitle: "Votre vie privée",
  bannerDescription:
    "Nous utilisons des cookies et des technologies similaires. Certains sont nécessaires au fonctionnement du site, d’autres nous aident à l’améliorer ou à afficher des contenus de tiers. Vous décidez lesquels autoriser et pouvez modifier votre choix à tout moment.",
  acceptAll: "Tout accepter",
  rejectAll: "Tout refuser",
  customize: "Paramètres",
  privacyPolicy: "Politique de confidentialité",
  imprint: "Mentions légales",
  preferencesTitle: "Paramètres de confidentialité",
  preferencesDescription:
    "Choisissez les catégories que vous souhaitez autoriser. Les technologies nécessaires sont toujours actives.",
  save: "Enregistrer la sélection",
  close: "Fermer",
  alwaysActive: "Toujours actif",
  services: "Services",
  provider: "Fournisseur",
  purpose: "Finalité",
  cookies: "Cookies",
  duration: "Durée de conservation",
  openPreferences: "Ouvrir les paramètres de confidentialité",
  embedTitle: "{service} est bloqué",
  embedDescription:
    "Ce contenu est fourni par {provider}. En le chargeant, des données sont transmises à {provider}.",
  embedLoadOnce: "Charger une fois",
  embedAlwaysAllow: "Toujours autoriser",
  categories: {
    necessary: {
      name: "Nécessaires",
      description:
        "Indispensables aux fonctions de base du site, par exemple pour mémoriser votre choix.",
    },
    preferences: {
      name: "Préférences",
      description: "Mémorisent des réglages comme la langue ou la région pour adapter le site.",
    },
    statistics: {
      name: "Statistiques",
      description: "Nous aident à comprendre l’utilisation du site afin de l’améliorer.",
    },
    marketing: {
      name: "Marketing",
      description: "Servent à rendre la publicité plus pertinente et à mesurer son efficacité.",
    },
    security: {
      name: "Sécurité",
      description: "Protègent le site et votre compte contre les abus.",
    },
  },
};

const it: Translations = {
  bannerTitle: "La tua privacy",
  bannerDescription:
    "Utilizziamo cookie e tecnologie simili. Alcuni sono necessari per il funzionamento del sito, altri ci aiutano a migliorarlo o a mostrare contenuti di terzi. Sei tu a decidere quali consentire e puoi modificare la tua scelta in qualsiasi momento.",
  acceptAll: "Accetta tutti",
  rejectAll: "Rifiuta tutti",
  customize: "Impostazioni",
  privacyPolicy: "Informativa sulla privacy",
  imprint: "Note legali",
  preferencesTitle: "Impostazioni della privacy",
  preferencesDescription:
    "Scegli quali categorie consentire. Le tecnologie necessarie sono sempre attive.",
  save: "Salva selezione",
  close: "Chiudi",
  alwaysActive: "Sempre attivo",
  services: "Servizi",
  provider: "Fornitore",
  purpose: "Finalità",
  cookies: "Cookie",
  duration: "Durata di conservazione",
  openPreferences: "Apri le impostazioni della privacy",
  embedTitle: "{service} è bloccato",
  embedDescription:
    "Questo contenuto è fornito da {provider}. Caricandolo, i dati vengono trasmessi a {provider}.",
  embedLoadOnce: "Carica una volta",
  embedAlwaysAllow: "Consenti sempre",
  categories: {
    necessary: {
      name: "Necessari",
      description:
        "Indispensabili per le funzioni di base del sito, ad esempio per memorizzare la tua scelta.",
    },
    preferences: {
      name: "Preferenze",
      description: "Memorizzano impostazioni come lingua o regione per adattare il sito a te.",
    },
    statistics: {
      name: "Statistiche",
      description: "Ci aiutano a capire come viene utilizzato il sito per migliorarlo.",
    },
    marketing: {
      name: "Marketing",
      description: "Servono a rendere la pubblicità più pertinente e a misurarne l’efficacia.",
    },
    security: {
      name: "Sicurezza",
      description: "Proteggono il sito e il tuo account dagli abusi.",
    },
  },
};

export const translations: Readonly<Record<string, Translations>> = {
  de,
  "de-CH": mapStrings(de, swissify),
  en,
  fr,
  it,
};

export const DEFAULT_LANGUAGE = "en";

/** Candidate locales from most to least specific: "de-CH" → ["de-CH", "de"]. */
function localeChain(language: string | undefined): string[] {
  if (!language) return [];
  const base = language.split("-")[0] ?? language;
  return base === language ? [language] : [language, base];
}

export function resolveLanguage(language: string | undefined): string {
  for (const candidate of localeChain(language)) {
    if (translations[candidate]) return candidate;
  }
  return DEFAULT_LANGUAGE;
}

export type TranslationOverrides = Partial<Omit<Translations, "categories">> & {
  categories?: Record<string, Partial<CategoryTexts>>;
};

export function getTranslations(
  language: string | undefined,
  overrides?: TranslationOverrides,
): Translations {
  const base = translations[resolveLanguage(language)] as Translations;
  if (!overrides) return base;
  const categories: Record<string, CategoryTexts> = { ...base.categories };
  for (const [id, texts] of Object.entries(overrides.categories ?? {})) {
    categories[id] = { name: "", description: "", ...categories[id], ...texts };
  }
  return { ...base, ...overrides, categories };
}

/** Resolves a `LocalizedText` for a language, falling back to the base language, then English. */
export function localize(text: LocalizedText | undefined, language: string | undefined): string {
  if (text === undefined) return "";
  if (typeof text === "string") return text;
  for (const candidate of [...localeChain(language), DEFAULT_LANGUAGE]) {
    const value = text[candidate];
    if (value !== undefined) return value;
  }
  return Object.values(text)[0] ?? "";
}

export function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
