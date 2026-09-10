import test from "node:test";
import assert from "node:assert/strict";
import { handleSubmission, validateSubmission } from "./submissions.mjs";

const body = {
  kind: "waitlist",
  email: " TEST@example.com ",
  consent: true,
  website: "",
};
const env = {
  PUBLIC_SITE_ORIGIN: "https://www.papayahealth.com",
  SUBMISSION_HASH_SECRET: "test-only",
};

async function run({
  value = body,
  method = "POST",
  headers = {},
  storageFetcher,
  fetcher,
  settings = env,
  hits = 1,
} = {}) {
  const request = new Request("https://www.papayahealth.com/api/submit", {
    method,
    headers: {
      origin: "https://www.papayahealth.com",
      "content-type": "application/json",
      ...headers,
    },
    ...(method === "POST" ? { body: JSON.stringify(value) } : {}),
  });
  const db = {
    prepare(sql) {
      return {
        sql,
        bind(...values) {
          return { sql, values };
        },
      };
    },
    async batch(statements) {
      if (storageFetcher) {
        const response = await storageFetcher("", {
          body: JSON.stringify(statements),
        });
        if (!response.ok) throw Error("offline");
        const data = await response.json();
        if (data.error) throw Error("unconfirmed");
      }
      return [
        { success: true },
        { success: true, results: [{ hits }] },
        { success: true },
      ];
    },
  };
  const response = await handleSubmission(
    request,
    settings === env
      ? { ...env, DB: db, SUBMISSION_HASH_SECRET: "test-only" }
      : settings,
    undefined,
    fetcher,
  );
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.json(),
  };
}

test("validation limits fields and normalizes email", () => {
  assert.deepEqual(
    validateSubmission({ ...body, medicalNotes: "never retain" }),
    {
      kind: "waitlist",
      email: "test@example.com",
      consentVersion: "2026-09-10",
    },
  );
  for (const bad of [
    { ...body, consent: false },
    { ...body, email: "bad" },
    { ...body, website: "bot" },
    { ...body, kind: "clinic" },
    { ...body, email: "a".repeat(260) + "@a.com" },
  ])
    assert.equal(validateSubmission(bad), null);
});

test("requires POST, same origin, JSON and bounded input", async () => {
  assert.equal((await run({ method: "GET" })).statusCode, 405);
  assert.equal(
    (await run({ headers: { origin: "https://unrelated.example" } }))
      .statusCode,
    403,
  );
  assert.equal(
    (await run({ headers: { "content-type": "text/plain" } })).statusCode,
    415,
  );
  assert.equal(
    (await run({ value: { ...body, extra: "x".repeat(5000) } })).statusCode,
    413,
  );
});

test("does not report success when storage is absent, fails, or does not confirm saving", async () => {
  assert.equal(
    (await run({ settings: { PUBLIC_SITE_ORIGIN: env.PUBLIC_SITE_ORIGIN } }))
      .statusCode,
    503,
  );
  for (const storageFailure of [
    async () => {
      throw Error("offline");
    },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ error: "failed" }) }),
  ]) {
    assert.equal((await run({ storageFetcher: storageFailure })).statusCode, 503);
  }
});

test("confirmed database batch acknowledges saving", async () => {
  const response = await run();
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.saved, true);
});

test("notifies team inbox after waitlist signup", async () => {
  let requested;
  const response = await run({
    settings: {
      ...env,
      DB: {
        prepare(sql) {
          return {
            sql,
            bind(...values) {
              return { sql, values };
            },
          };
        },
        async batch() {
          return [
            { success: true },
            { success: true, results: [{ hits: 1 }] },
            { success: true },
          ];
        },
      },
      SUBMISSION_HASH_SECRET: "test-only",
      RESEND_API_KEY: "test-api-key",
      RESEND_FROM_EMAIL: "hello@papayahealth.com",
    },
    fetcher: async (url, options) => {
      requested = { url, options };
      return { ok: true };
    },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.saved, true);
  assert.equal(requested?.url, "https://api.resend.com/emails");
  const payload = JSON.parse(requested?.options.body);
  assert.equal(payload.from, "hello@papayahealth.com");
  assert.equal(payload.to[0], "hello@papayahealth.com");
  assert.equal(payload.subject, "New Papaya Health waitlist signup");
  assert.equal(payload.text, "A new email joined the waitlist: test@example.com");
});

test("does not notify team inbox for duplicate waitlist signup", async () => {
  let notified = 0;
  const response = await run({
    settings: {
      ...env,
      DB: {
        prepare(sql) {
          return {
            sql,
            bind(...values) {
              return { sql, values };
            },
          };
        },
        async batch() {
          return [
            { success: true },
            { success: true, results: [{ hits: 1 }] },
            { success: true, meta: { changes: 0 } },
          ];
        },
      },
      SUBMISSION_HASH_SECRET: "test-only",
      RESEND_API_KEY: "test-api-key",
      RESEND_FROM_EMAIL: "hello@papayahealth.com",
    },
    fetcher: async () => {
      notified++;
      return { ok: true };
    },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.saved, true);
  assert.equal(notified, 0);
});

test("still saves signup when team notification fails", async () => {
  const response = await run({
    settings: {
      ...env,
      DB: {
        prepare(sql) {
          return {
            sql,
            bind(...values) {
              return { sql, values };
            },
          };
        },
        async batch() {
          return [
            { success: true },
            { success: true, results: [{ hits: 1 }] },
            { success: true, meta: { changes: 1 } },
          ];
        },
      },
      SUBMISSION_HASH_SECRET: "test-only",
      RESEND_API_KEY: "test-api-key",
      RESEND_FROM_EMAIL: "hello@papayahealth.com",
    },
    fetcher: async () => ({ ok: false }),
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.saved, true);
});

test("storage rate limit produces retry guidance", async () => {
  const response = await run({ hits: 11 });
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers["retry-after"], "3600");
});