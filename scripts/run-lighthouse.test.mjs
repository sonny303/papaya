import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  LIGHTHOUSE_OUTPUT_RELATIVE_DIRECTORY,
  aggregateReports,
  budgetFailures,
  validateBudget,
} from "./run-lighthouse.mjs";

const routeMetadata = {
  "/": { indexable: true },
  "/who-we-serve": { indexable: true },
  "/about-us": { indexable: true },
  "/terms": { indexable: false },
  "/privacy": { indexable: false },
};
const thresholds = {
  performance: 0.9,
  accessibility: 0.9,
  "best-practices": 0.9,
  "largest-contentful-paint": 2500,
  "cumulative-layout-shift": 0.1,
  "total-blocking-time": 200,
  "image-size-responsive": 0.9,
  "unsized-images": 0.9,
  "image-delivery-insight": 0.9,
  "image-delivery-wasted-bytes": 20480,
};

function budget(overrides = {}) {
  return {
    runs: 3,
    routes: ["/", "/who-we-serve", "/about-us"],
    thresholds,
    ...overrides,
  };
}

function report({
  performance,
  accessibility,
  bestPractices,
  lcp,
  cls,
  tbt,
  responsive,
  unsized,
  delivery,
  wastedBytes,
}) {
  return {
    categories: {
      performance: { score: performance },
      accessibility: { score: accessibility },
      "best-practices": { score: bestPractices },
    },
    audits: {
      "largest-contentful-paint": { numericValue: lcp },
      "cumulative-layout-shift": { numericValue: cls },
      "total-blocking-time": { numericValue: tbt },
      "image-size-responsive": { score: responsive },
      "unsized-images": { score: unsized },
      "image-delivery-insight": {
        score: delivery,
        details: { items: [{ wastedBytes }] },
      },
    },
  };
}

test("repository Lighthouse policy covers every and only indexable route", async () => {
  const repositoryBudget = JSON.parse(
    await readFile(
      new URL("../lighthouse-budget.json", import.meta.url),
      "utf8",
    ),
  );
  const repositoryMetadata = JSON.parse(
    await readFile(
      new URL("../src/data/route-metadata.json", import.meta.url),
      "utf8",
    ),
  );

  assert.deepEqual(
    validateBudget(repositoryBudget, repositoryMetadata).routes,
    ["/", "/who-we-serve", "/about-us"],
  );
});

test("Lighthouse policy rejects invalid run counts", () => {
  for (const runs of [0, -1, 2, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => validateBudget(budget({ runs }), routeMetadata),
      /positive odd integer/,
    );
  }
});

test("Lighthouse policy rejects incomplete, extra, duplicate, and empty routes", () => {
  for (const routes of [
    [],
    ["/"],
    ["/", "/who-we-serve", "/about-us", "/terms"],
    ["/", "/who-we-serve", "/about-us", "/about-us"],
  ]) {
    assert.throws(
      () => validateBudget(budget({ routes }), routeMetadata),
      /exactly match indexable routes/,
    );
  }
});

test("Lighthouse policy requires every threshold and rejects extras", () => {
  assert.throws(
    () => validateBudget(budget({ thresholds: {} }), routeMetadata),
    /exactly match/,
  );
  const missingThreshold = { ...thresholds };
  delete missingThreshold.accessibility;
  assert.throws(
    () =>
      validateBudget(budget({ thresholds: missingThreshold }), routeMetadata),
    /exactly match/,
  );
  assert.throws(
    () =>
      validateBudget(
        budget({ thresholds: { ...thresholds, unexpected: 1 } }),
        routeMetadata,
      ),
    /exactly match/,
  );
});

test("Lighthouse policy rejects non-finite and out-of-range thresholds", () => {
  for (const threshold of [null, "0.9", Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () =>
        validateBudget(
          budget({ thresholds: { ...thresholds, performance: threshold } }),
          routeMetadata,
        ),
      /finite number/,
    );
  }
  for (const [name, threshold] of [
    ["accessibility", 1.1],
    ["performance", -0.1],
    ["largest-contentful-paint", -1],
  ]) {
    assert.throws(
      () =>
        validateBudget(
          budget({ thresholds: { ...thresholds, [name]: threshold } }),
          routeMetadata,
        ),
      /outside its range/,
    );
  }
});

test("aggregation uses medians for noisy metrics and worst cases for stable metrics", () => {
  const reports = [
    report({
      performance: 0.95,
      accessibility: 0.99,
      bestPractices: 1,
      lcp: 1000,
      cls: 0,
      tbt: 0,
      responsive: 0.9,
      unsized: 1,
      delivery: 0.9,
      wastedBytes: 1,
    }),
    report({
      performance: 0.1,
      accessibility: 0.8,
      bestPractices: 0.7,
      lcp: 5000,
      cls: 0.5,
      tbt: 800,
      responsive: 0.1,
      unsized: 0,
      delivery: 0.2,
      wastedBytes: 30000,
    }),
    report({
      performance: 0.9,
      accessibility: 1,
      bestPractices: 0.95,
      lcp: 2000,
      cls: 0.1,
      tbt: 100,
      responsive: 1,
      unsized: 0.9,
      delivery: 1,
      wastedBytes: 200,
    }),
  ];

  assert.deepEqual(aggregateReports(reports, thresholds), {
    performance: 0.9,
    accessibility: 0.8,
    "best-practices": 0.7,
    "largest-contentful-paint": 2000,
    "cumulative-layout-shift": 0.1,
    "total-blocking-time": 100,
    "image-size-responsive": 0.1,
    "unsized-images": 0,
    "image-delivery-insight": 0.2,
    "image-delivery-wasted-bytes": 30000,
  });
});

test("budget evaluation catches deterministic and image-waste worst cases", () => {
  const measurements = {
    performance: 0.9,
    accessibility: 0.8,
    "best-practices": 0.7,
    "largest-contentful-paint": 2000,
    "cumulative-layout-shift": 0.1,
    "total-blocking-time": 100,
    "image-size-responsive": 0.1,
    "unsized-images": 0,
    "image-delivery-insight": 0.2,
    "image-delivery-wasted-bytes": 30000,
  };
  const failures = budgetFailures([{ route: "/", measurements }], thresholds);

  assert.ok(failures.some((failure) => failure.includes("accessibility")));
  assert.ok(
    failures.some((failure) => failure.includes("image-delivery-wasted-bytes")),
  );
  assert.ok(
    !failures.some((failure) => failure.includes("largest-contentful-paint")),
  );
});

test("aggregation rejects missing and non-finite Lighthouse samples", () => {
  const valid = report({
    performance: 0.95,
    accessibility: 1,
    bestPractices: 1,
    lcp: 1000,
    cls: 0,
    tbt: 0,
    responsive: 1,
    unsized: 1,
    delivery: 1,
    wastedBytes: 0,
  });

  assert.throws(
    () => aggregateReports([{ ...valid, categories: {} }], thresholds),
    /finite number/,
  );
  assert.throws(
    () =>
      aggregateReports(
        [
          {
            ...valid,
            audits: {
              ...valid.audits,
              "largest-contentful-paint": { numericValue: null },
            },
          },
        ],
        thresholds,
      ),
    /finite number/,
  );
});

test("Lighthouse evidence path is nonhidden and stable", () => {
  assert.equal(LIGHTHOUSE_OUTPUT_RELATIVE_DIRECTORY, "evidence/lighthouse");
  assert.ok(
    LIGHTHOUSE_OUTPUT_RELATIVE_DIRECTORY.split("/").every(
      (segment) => !segment.startsWith("."),
    ),
  );
});
