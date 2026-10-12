import { describe, expect, it, vi } from "vitest";
import {
  CONSENT_WEBHOOK_FORMAT,
  type ConsentConfig,
  connectConsentWebhook,
  createConsentManager,
  createMemoryStorage,
  parseConsentWebhookPayload,
} from "../src";

const config = (overrides: Partial<ConsentConfig> = {}): ConsentConfig => ({
  consentVersion: "7",
  policyVersion: "p1",
  categories: [{ id: "necessary", required: true }, { id: "marketing" }],
  purposes: [
    { id: "newsletter", category: "marketing" },
    { id: "ads", category: "marketing" },
  ],
  storage: createMemoryStorage(),
  now: () => new Date("2026-10-12T12:00:00.000Z"),
  ...overrides,
});

const okFetch = () => vi.fn(async () => new Response(null, { status: 204 }));
const bodyOf = (fn: ReturnType<typeof okFetch>, call = 0) =>
  JSON.parse((fn.mock.calls[call] as unknown as [string, { body: string }])[1].body);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("connectConsentWebhook", () => {
  it("sends purposes, the decision and what was revoked on every change", async () => {
    const manager = createConsentManager(config());
    const fetchMock = okFetch();
    connectConsentWebhook(manager, { url: "https://example.com/hook", fetch: fetchMock });

    await manager.acceptAll("banner");
    await flush();
    await manager.setPurposeConsent("ads", false);
    await flush();
    await manager.update({ marketing: false });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [first, second, third] = [
      bodyOf(fetchMock, 0),
      bodyOf(fetchMock, 1),
      bodyOf(fetchMock, 2),
    ];
    expect(first).toMatchObject({
      format: CONSENT_WEBHOOK_FORMAT,
      event: "consent_updated",
      decidedAt: "2026-10-12T12:00:00.000Z",
      consentVersion: "7",
      policyVersion: "p1",
      source: "banner",
      purposes: { newsletter: true, ads: true, necessary: true },
      revoked: { purposes: [], categories: [], services: [] },
    });
    expect(second.revoked.purposes).toEqual(["ads"]);
    expect(third.revoked).toMatchObject({ purposes: ["newsletter"], categories: ["marketing"] });
    expect(third.purposes).toMatchObject({ newsletter: false, ads: false });
  });

  it("sends a reset as its own event", async () => {
    const manager = createConsentManager(config());
    await manager.acceptAll();
    const fetchMock = okFetch();
    connectConsentWebhook(manager, { url: "https://example.com/hook", fetch: fetchMock });
    await manager.reset();
    await flush();
    const payload = bodyOf(fetchMock);
    expect(payload.event).toBe("consent_reset");
    expect(payload.decidedAt).toBeNull();
    expect(payload.revoked.purposes.sort()).toEqual(["ads", "newsletter"]);
  });

  it("adds the subject and custom headers, posts without credentials", async () => {
    const manager = createConsentManager(config());
    const fetchMock = okFetch();
    connectConsentWebhook(manager, {
      url: "https://example.com/hook",
      fetch: fetchMock,
      headers: { "x-site": "shop" },
      subject: () => "cust_42",
    });
    await manager.acceptAll();
    await flush();
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "omit" });
    expect(init.headers).toMatchObject({ "content-type": "application/json", "x-site": "shop" });
    expect(bodyOf(fetchMock).subject).toBe("cust_42");
  });

  it("retries after a server error and reports a final failure", async () => {
    const manager = createConsentManager(config());
    const fetchMock = vi.fn(async () => new Response(null, { status: 503 }));
    const onError = vi.fn();
    connectConsentWebhook(manager, {
      url: "https://example.com/hook",
      fetch: fetchMock,
      retries: 2,
      retryDelayMs: 1,
      onError,
    });
    await manager.acceptAll();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 4xx and stops after unsubscribing", async () => {
    const manager = createConsentManager(config());
    const fetchMock = vi.fn(async () => new Response(null, { status: 400 }));
    const onError = vi.fn();
    const stop = connectConsentWebhook(manager, {
      url: "https://example.com/hook",
      fetch: fetchMock,
      retryDelayMs: 1,
      onError,
    });
    await manager.acceptAll();
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    stop();
    await manager.rejectAll();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stays quiet for decisions that only arrived from another tab", async () => {
    const manager = createConsentManager(config());
    const fetchMock = okFetch();
    connectConsentWebhook(manager, { url: "https://example.com/hook", fetch: fetchMock });
    const events: string[] = [];
    manager.on("consent_updated", (e) => events.push(e.origin));
    await manager.acceptAll();
    await flush();
    expect(events).toEqual(["local"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("parseConsentWebhookPayload", () => {
  it("accepts what connectConsentWebhook sends, as object or text", async () => {
    const manager = createConsentManager(config());
    const fetchMock = okFetch();
    connectConsentWebhook(manager, { url: "https://example.com/hook", fetch: fetchMock });
    await manager.acceptAll();
    await flush();
    const raw = (fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body;
    expect(parseConsentWebhookPayload(raw)?.purposes.ads).toBe(true);
    expect(parseConsentWebhookPayload(JSON.parse(raw))?.event).toBe("consent_updated");
  });

  it("rejects other formats, missing fields and wrong types", () => {
    expect(parseConsentWebhookPayload(null)).toBeNull();
    expect(parseConsentWebhookPayload("not json")).toBeNull();
    expect(parseConsentWebhookPayload({ format: "permito.consent/1" })).toBeNull();
    expect(
      parseConsentWebhookPayload({
        format: CONSENT_WEBHOOK_FORMAT,
        id: "x",
        event: "consent_updated",
        sentAt: "t",
        decidedAt: null,
        consentVersion: "1",
        purposes: { a: "yes" },
        categories: {},
        services: {},
        revoked: { purposes: [], categories: [], services: [] },
      }),
    ).toBeNull();
  });
});
