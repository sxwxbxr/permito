import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  if (typeof document === "undefined") return;
  cleanup();
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    // biome-ignore lint/suspicious/noDocumentCookie: test cleanup
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
  document.head.innerHTML = "";
  document.body.style.overflow = "";
});
