import { describe, expect, it } from "vitest";
import { createApp, defineComponent, effectScope, h, nextTick } from "vue";
import { createConsentManager, createMemoryStorage } from "../src";
import { categoryStore, consentStore, needsConsentStore, serviceStore } from "../src/svelte";
import { permito, useConsent, useHasConsent, useHasServiceConsent } from "../src/vue";

const make = async () => {
  const manager = createConsentManager({
    consentVersion: "1",
    categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
    services: [{ id: "youtube", name: "YouTube", category: "marketing" }],
    storage: createMemoryStorage(),
    syncTabs: false,
  });
  await manager.ready;
  return manager;
};

describe("svelte stores", () => {
  it("call the subscriber immediately and on every change", async () => {
    const manager = await make();
    const seen: boolean[] = [];
    const stop = categoryStore(manager, "statistics").subscribe((v) => seen.push(v));
    expect(seen).toEqual([false]);
    await manager.update({ statistics: true });
    await manager.update({ statistics: false });
    stop();
    await manager.update({ statistics: true });
    expect(seen).toEqual([false, true, false]);
  });

  it("expose the snapshot with helpers", async () => {
    const manager = await make();
    let value: ReturnType<typeof Object> | undefined;
    consentStore(manager).subscribe((v) => {
      value = v;
    });
    await manager.acceptAll();
    const view = value as unknown as {
      hasConsent(c: string): boolean;
      hasServiceConsent(s: string): boolean;
    };
    expect(view.hasConsent("marketing")).toBe(true);
    expect(view.hasServiceConsent("youtube")).toBe(true);
  });

  it("track service and banner state", async () => {
    const manager = await make();
    const service: boolean[] = [];
    const banner: boolean[] = [];
    serviceStore(manager, "youtube").subscribe((v) => service.push(v));
    needsConsentStore(manager).subscribe((v) => banner.push(v));
    await manager.acceptAll();
    expect(service.slice(-1)[0]).toBe(true);
    expect(banner.slice(-1)[0]).toBe(false);
    expect(banner[0]).toBe(true);
  });
});

describe("vue composables", () => {
  it("are reactive and stop listening with the scope", async () => {
    const manager = await make();
    const scope = effectScope();
    const { stats, yt, consent } = scope.run(() => ({
      stats: useHasConsent("statistics", manager),
      yt: useHasServiceConsent("youtube", manager),
      consent: useConsent(manager),
    })) as {
      stats: ReturnType<typeof useHasConsent>;
      yt: ReturnType<typeof useHasServiceConsent>;
      consent: ReturnType<typeof useConsent>;
    };
    expect(stats.value).toBe(false);
    await consent.acceptAll();
    expect(stats.value).toBe(true);
    expect(yt.value).toBe(true);
    expect(consent.hasConsent("marketing")).toBe(true);
    scope.stop();
    await manager.rejectAll();
    expect(stats.value).toBe(true); // no longer updated after the scope stopped
  });

  it("use the manager installed with app.use()", async () => {
    const manager = await make();
    let result: ReturnType<typeof useConsent> | undefined;
    const Child = defineComponent({
      setup() {
        result = useConsent();
        return () => h("div", String(result?.snapshot.value.needsConsent));
      },
    });
    const root = document.createElement("div");
    const app = createApp(Child).use(permito(manager));
    app.mount(root);
    expect(root.textContent).toBe("true");
    await manager.acceptAll();
    await nextTick();
    expect(root.textContent).toBe("false");
    app.unmount();
  });

  it("throw a clear error without a manager", () => {
    const scope = effectScope();
    expect(() => scope.run(() => useConsent())).toThrow(/no consent manager/);
  });
});
