import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

export const LIGHTHOUSE_OUTPUT_RELATIVE_DIRECTORY = "evidence/lighthouse";

const CATEGORY_METRICS = new Set([
  "performance",
  "accessibility",
  "best-practices",
]);
const SCORE_METRICS = new Set([
  ...CATEGORY_METRICS,
  "image-size-responsive",
  "unsized-images",
  "image-delivery-insight",
]);
const MEDIAN_METRICS = new Set([
  "performance",
  "largest-contentful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
]);
const MAXIMUM_METRICS = new Set([
  "largest-contentful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
  "image-delivery-wasted-bytes",
]);
const NUMERIC_AUDIT_METRICS = new Set([
  "largest-contentful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
]);
const REQUIRED_METRICS = [
  "performance",
  "accessibility",
  "best-practices",
  "largest-contentful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
  "image-size-responsive",
  "unsized-images",
  "image-delivery-insight",
  "image-delivery-wasted-bytes",
];

function objectRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value, description) {
  if (!Number.isFinite(value)) {
    throw new Error(`${description} must be a finite number.`);
  }
  return value;
}

export function indexableRoutesFromMetadata(routeMetadata) {
  if (!objectRecord(routeMetadata)) {
    throw new Error("Route metadata must be an object.");
  }

  const routes = [];
  for (const [route, metadata] of Object.entries(routeMetadata)) {
    if (!route.startsWith("/") || !objectRecord(metadata)) {
      throw new Error(`Route metadata for ${route} is invalid.`);
    }
    if (typeof metadata.indexable !== "boolean") {
      throw new Error(
        `Route metadata for ${route} lacks an indexable boolean.`,
      );
    }
    if (metadata.indexable) routes.push(route);
  }

  if (routes.length === 0) {
    throw new Error("Route metadata contains no indexable routes.");
  }
  return routes;
}

export function validateBudget(budget, routeMetadata) {
  if (!objectRecord(budget)) {
    throw new Error("Lighthouse budget must be an object.");
  }
  if (
    !Number.isInteger(budget.runs) ||
    budget.runs <= 0 ||
    budget.runs % 2 === 0
  ) {
    throw new Error("Lighthouse runs must be a positive odd integer.");
  }

  const expectedRoutes = indexableRoutesFromMetadata(routeMetadata);
  if (
    !Array.isArray(budget.routes) ||
    budget.routes.some((route) => typeof route !== "string")
  ) {
    throw new Error("Lighthouse routes must be an array of route strings.");
  }
  const configuredRoutes = new Set(budget.routes);
  const missingRoutes = expectedRoutes.filter(
    (route) => !configuredRoutes.has(route),
  );
  const unexpectedRoutes = budget.routes.filter(
    (route) => !expectedRoutes.includes(route),
  );
  if (
    configuredRoutes.size !== budget.routes.length ||
    missingRoutes.length > 0 ||
    unexpectedRoutes.length > 0
  ) {
    throw new Error(
      `Lighthouse routes must exactly match indexable routes: ${expectedRoutes.join(", ")}.`,
    );
  }

  if (!objectRecord(budget.thresholds)) {
    throw new Error("Lighthouse thresholds must be an object.");
  }
  const thresholdNames = Object.keys(budget.thresholds);
  if (
    thresholdNames.length !== REQUIRED_METRICS.length ||
    REQUIRED_METRICS.some((name) => !thresholdNames.includes(name))
  ) {
    throw new Error(
      `Lighthouse thresholds must exactly match: ${REQUIRED_METRICS.join(", ")}.`,
    );
  }
  for (const [name, threshold] of Object.entries(budget.thresholds)) {
    finiteNumber(threshold, `Lighthouse threshold ${name}`);
    if (
      (SCORE_METRICS.has(name) && (threshold < 0 || threshold > 1)) ||
      (MAXIMUM_METRICS.has(name) && threshold < 0)
    ) {
      throw new Error(`Lighthouse threshold ${name} is outside its range.`);
    }
  }

  return {
    runs: budget.runs,
    routes: expectedRoutes,
    thresholds: budget.thresholds,
  };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

export function aggregationForMetric(name) {
  return MEDIAN_METRICS.has(name) ? "median" : "worst-case";
}

export function aggregateMetricSamples(name, samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error(`${name} has no Lighthouse samples.`);
  }
  samples.forEach((sample, index) =>
    finiteNumber(sample, `${name} sample ${index + 1}`),
  );

  if (MEDIAN_METRICS.has(name)) return median(samples);
  return MAXIMUM_METRICS.has(name)
    ? Math.max(...samples)
    : Math.min(...samples);
}

export function metric(report, name) {
  if (!objectRecord(report)) {
    throw new Error("Lighthouse report must be an object.");
  }

  if (CATEGORY_METRICS.has(name)) {
    return finiteNumber(
      report.categories?.[name]?.score,
      `Lighthouse ${name} score`,
    );
  }

  if (name === "image-delivery-wasted-bytes") {
    const items = report.audits?.["image-delivery-insight"]?.details?.items;
    if (items === undefined) return 0;
    if (!Array.isArray(items)) {
      throw new Error("Lighthouse image delivery items must be an array.");
    }
    return finiteNumber(
      items.reduce((total, item, index) => {
        const wastedBytes = item?.wastedBytes ?? 0;
        return (
          total +
          finiteNumber(
            wastedBytes,
            `Lighthouse image wasted bytes item ${index + 1}`,
          )
        );
      }, 0),
      "Lighthouse image wasted bytes",
    );
  }

  const audit = report.audits?.[name];
  if (!audit) throw new Error(`Lighthouse report is missing ${name}.`);
  return finiteNumber(
    NUMERIC_AUDIT_METRICS.has(name) ? audit.numericValue : audit.score,
    `Lighthouse ${name} value`,
  );
}

export function aggregateReports(reports, thresholds) {
  if (!Array.isArray(reports) || reports.length === 0) {
    throw new Error("Lighthouse produced no reports.");
  }
  return Object.fromEntries(
    Object.keys(thresholds).map((name) => [
      name,
      aggregateMetricSamples(
        name,
        reports.map((report) => metric(report, name)),
      ),
    ]),
  );
}

export function budgetFailures(summaries, thresholds) {
  const failures = [];
  for (const { route, measurements } of summaries) {
    for (const [name, threshold] of Object.entries(thresholds)) {
      const measured = finiteNumber(
        measurements[name],
        `${route} ${name} aggregate`,
      );
      if (
        MAXIMUM_METRICS.has(name) ? measured > threshold : measured < threshold
      ) {
        failures.push(`${route} ${name}: ${measured} (threshold ${threshold})`);
      }
    }
  }
  return failures;
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`${command} exited with signal ${signal}.`));
      else if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with status ${code ?? 1}.`));
    });
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not allocate a local preview port.");
  }
  await new Promise((resolvePromise, reject) =>
    server.close((error) => (error ? reject(error) : resolvePromise())),
  );
  return address.port;
}

async function waitForPreview(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview process is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw new Error(`Preview server did not become ready at ${url}.`);
}

export async function runLighthouse({ root = process.cwd() } = {}) {
  const binDirectory = join(root, "node_modules", ".bin");
  const lighthouseExecutable = join(
    binDirectory,
    process.platform === "win32" ? "lighthouse.cmd" : "lighthouse",
  );
  const viteExecutable = join(
    binDirectory,
    process.platform === "win32" ? "vite.cmd" : "vite",
  );
  const chromePath = chromium.executablePath();
  const reportsDirectory = join(
    root,
    ...LIGHTHOUSE_OUTPUT_RELATIVE_DIRECTORY.split("/"),
  );
  const budget = validateBudget(
    JSON.parse(await readFile(join(root, "lighthouse-budget.json"), "utf8")),
    JSON.parse(
      await readFile(join(root, "src/data/route-metadata.json"), "utf8"),
    ),
  );

  for (const [name, path] of [
    ["Lighthouse", lighthouseExecutable],
    ["Vite", viteExecutable],
    ["Chromium", chromePath],
  ]) {
    if (!existsSync(path)) throw new Error(`${name} executable is missing.`);
  }

  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const preview = spawn(
    viteExecutable,
    ["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { stdio: "ignore" },
  );

  try {
    await waitForPreview(origin);
    await rm(reportsDirectory, { force: true, recursive: true });
    await mkdir(reportsDirectory, { recursive: true });
    const summaries = [];

    for (const route of budget.routes) {
      const label =
        route === "/" ? "home" : route.replaceAll("/", "-").slice(1);
      const reports = [];

      for (let runIndex = 1; runIndex <= budget.runs; runIndex += 1) {
        const outputPath = join(
          reportsDirectory,
          `${label}-${runIndex}.report.json`,
        );
        await run(
          lighthouseExecutable,
          [
            `${origin}${route}`,
            "--quiet",
            "--output=json",
            `--output-path=${outputPath}`,
            "--only-categories=performance,accessibility,best-practices",
            "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
          ],
          { env: { ...process.env, CHROME_PATH: chromePath } },
        );
        reports.push(JSON.parse(await readFile(outputPath, "utf8")));
      }

      const measurements = aggregateReports(reports, budget.thresholds);
      const aggregations = Object.fromEntries(
        Object.keys(budget.thresholds).map((name) => [
          name,
          aggregationForMetric(name),
        ]),
      );
      summaries.push({ route, measurements, aggregations });
    }

    await writeFile(
      join(reportsDirectory, "summary.json"),
      `${JSON.stringify(summaries, null, 2)}\n`,
    );

    const failures = budgetFailures(summaries, budget.thresholds);
    if (failures.length > 0) throw new Error(failures.join("\n"));
    for (const { route, measurements } of summaries) {
      console.log(
        `${route} Lighthouse aggregate: ${JSON.stringify(measurements)}`,
      );
    }
  } finally {
    preview.kill("SIGTERM");
  }
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isEntrypoint) await runLighthouse();
