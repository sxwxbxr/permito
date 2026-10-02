import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://permito.dev",
  integrations: [
    starlight({
      title: "Permito",
      description: "Privacy-first consent toolkit for React and Next.js.",
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/sxwxbxr/permito" }],
      sidebar: [
        { label: "Start", items: ["introduction", "demo"] },
        {
          label: "Guides",
          items: [
            "guides/nextjs",
            "guides/react-vite",
            "guides/vanilla",
            "guides/blocking",
            "guides/google-consent-mode",
            "guides/theming",
            "guides/translations",
          ],
        },
        {
          label: "Reference",
          items: [
            "reference/configuration",
            "reference/components",
            "reference/hooks",
            "reference/core-api",
          ],
        },
        { label: "Legal", items: ["legal"] },
      ],
    }),
    react(),
  ],
});
