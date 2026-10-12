---
title: Withdrawal across systems
description: Make a withdrawn consent reach your CRM, e-mail tool and analytics backend, not only the scripts in the browser. Applies to the GDPR and to laws like India's DPDP Act.
---

A consent banner stops scripts in the browser. When a visitor withdraws consent, that is only half of the job: the newsletter tool, the CRM and the analytics backend still hold the data and keep processing it unless something tells them to stop. The GDPR expects withdrawal to be as easy as giving consent and to take effect. India's DPDP Act (section 6) additionally requires that processors stop once consent is withdrawn.

Permito covers the browser. This guide shows how the withdrawal gets to your servers, and how to test that it reached every system.

This is technical infrastructure, not legal advice. Which systems you must update and how fast is a decision for you and your counsel.

## Two sides

| Side | What happens | Tool |
|---|---|---|
| Browser | Scripts stop loading, blocked embeds go back to placeholders, Consent Mode updates, other tabs follow. | Permito core, nothing to add. |
| Server | Your backend learns that consent changed and tells every system that holds data for the affected purposes. | `connectConsentWebhook` plus a receiver you build (or Permito Pro). |

## 1. Name your purposes

Give each processing purpose a stable id that you also use in the backend:

```ts
const manager = createConsentManager({
  consentVersion: "2026-10",
  categories: [{ id: "necessary", required: true }, { id: "marketing" }],
  purposes: [
    { id: "newsletter", category: "marketing" },
    { id: "ad-personalisation", category: "marketing" },
  ],
  services: [
    { id: "mailtool", name: "Mail tool", category: "marketing", purposes: ["newsletter"] },
  ],
});
```

## 2. Send every change to your server

```ts
import { connectConsentWebhook } from "@permitojs/core";

connectConsentWebhook(manager, {
  url: "https://api.example.com/consent-events",
  subject: () => currentCustomerId(), // optional: who changed their consent
  onError: (error, payload) => report(error, payload.id),
});
```

The webhook fires on every change, not only on withdrawal, so your backend has the complete history. Only the tab where the visitor decided sends, other tabs stay quiet. Delivery uses `sendBeacon` (survives closing the page) and falls back to `fetch` with retries; set `headers` to force `fetch`.

Each payload carries:

```json
{
  "format": "permito.consent/2",
  "id": "2026-10:2026-10-12T12:00:00.000Z:consent_updated",
  "event": "consent_updated",
  "decidedAt": "2026-10-12T12:00:00.000Z",
  "consentVersion": "2026-10",
  "purposes": { "necessary": true, "newsletter": false, "ad-personalisation": false },
  "categories": { "necessary": true, "marketing": false },
  "services": { "mailtool": false },
  "revoked": { "purposes": ["newsletter"], "categories": ["marketing"], "services": ["mailtool"] },
  "subject": "cust_42"
}
```

`event` is `consent_updated` or `consent_reset` (the visitor deleted the decision). `revoked` lists exactly what this change withdrew. Without a `subject`, the payload contains no personal data and your backend cannot tell whose consent changed, so pass one if you want to act on a specific person. Adding it is your decision as the operator.

## 3. Receive it

```ts
import { parseConsentWebhookPayload } from "@permitojs/core";

export async function POST(request: Request) {
  const payload = parseConsentWebhookPayload(await request.text());
  if (!payload) return new Response("bad request", { status: 400 });
  if (await alreadyProcessed(payload.id)) return new Response(null, { status: 204 });

  if (payload.subject && payload.revoked.purposes.length > 0) {
    await fanOut(payload.subject, payload.revoked.purposes); // CRM, e-mail tool, analytics
  }
  await markProcessed(payload.id);
  return new Response(null, { status: 204 });
}
```

Things your receiver has to handle:

- **Idempotence.** Retries repeat the `id`. Store it and ignore repeats.
- **Authentication.** The browser cannot hold a secret. Treat the endpoint as public: rate-limit it, validate the payload, and only act for a `subject` you can verify (a signed session, not the value in the payload alone).
- **Own failures.** If a downstream system is down, keep the withdrawal in a queue and retry. A withdrawal that was received but not applied is the case an auditor asks about.
- **Offline visitors.** A browser that is offline when the visitor withdraws cannot send. The decision is still stored in the browser, the webhook follows on the next change. If you need a guarantee, also compare the stored decision on the server side at login.

Permito Pro adds a ready-made receiver that writes into the consent log (with seals) and applies withdrawals to connected systems, see the Pro documentation.

## 4. Test it end to end

Run this whenever you add a system or change a purpose:

1. Consent to all purposes in a fresh browser profile. Check that each system has the visitor's data (or the flag that allows processing).
2. Withdraw one purpose in the preferences. Check that the webhook arrived (`revoked.purposes` has that purpose) and that exactly the systems for that purpose stopped. Systems for the other purposes keep working.
3. Withdraw everything and then delete the decision (`manager.reset()`). Check the `consent_reset` event and that every system stopped.
4. Consent again. Check that processing resumes only for the purposes granted.
5. Stop your receiver, withdraw, start it again. Check that the withdrawal is applied after the retry and that a duplicate delivery changes nothing.

Keep the result of this test with your records. It is the evidence that withdrawal works across systems, not only in the browser.

## Notes for DPDP

The DPDP Act is a different law with different duties and definitions, and Permito does not map its text. The technical mechanism is the same: consent per purpose, withdrawal that is propagated and provable. If you need Hindi or other Indian languages for the banner, you can supply them through `translations` today; they are not built in.
