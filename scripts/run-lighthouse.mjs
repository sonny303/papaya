import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const root = process.cwd();
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
const reportsDirectory = join(root, ".lighthouseci", "reports");
const budget = JSON.parse(
  await readFile(join(root, "lighthouse-budget.json"), "utf8"),
);

for (const [name, path] of [
  ["Lighthouse", lighthouseExecutable],
  ["Vite", viteExecutable],
  ["Chromium", chromePath],
]) {
  if (!existsSync(path)) throw new Error(`${name} executable is missing.`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`${command} exited with signal ${signal}.`));
      else if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code ?? 1}.`));
    });
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not allocate a local preview port.");
  }
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
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
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Preview server did not become ready at ${url}.`);
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function metric(report, name) {
  if (name in report.categories) return report.categories[name].score;
  if (name === "image-delivery-wasted-bytes") {
    return (
      report.audits["image-delivery-insight"]?.details?.items ?? []
    ).reduce((total, item) => total + (item.wastedBytes ?? 0), 0);
  }
  const audit = report.audits[name];
  if (!audit) throw new Error(`Lighthouse report is missing ${name}.`);
  return [
    "largest-contentful-paint",
    "cumulative-layout-shift",
    "total-blocking-time",
  ].includes(name)
    ? audit.numericValue
    : audit.score;
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
    const label = route === "/" ? "home" : route.replaceAll("/", "-").slice(1);
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

    const measurements = Object.fromEntries(
      Object.keys(budget.thresholds).map((name) => [
        name,
        median(reports.map((report) => metric(report, name))),
      ]),
    );
    summaries.push({ route, measurements });
  }

  const failures = [];
  for (const { route, measurements } of summaries) {
    for (const [name, threshold] of Object.entries(budget.thresholds)) {
      const measured = measurements[name];
      const maximumMetric = [
        "largest-contentful-paint",
        "cumulative-layout-shift",
        "total-blocking-time",
        "image-delivery-wasted-bytes",
      ].includes(name);
      if (maximumMetric ? measured > threshold : measured < threshold) {
        failures.push(`${route} ${name}: ${measured} (threshold ${threshold})`);
      }
    }
  }

  await writeFile(
    join(reportsDirectory, "summary.json"),
    `${JSON.stringify(summaries, null, 2)}\n`,
  );

  if (failures.length > 0) throw new Error(failures.join("\n"));
  for (const { route, measurements } of summaries) {
    console.log(`${route} Lighthouse medians: ${JSON.stringify(measurements)}`);
  }
} finally {
  preview.kill("SIGTERM");
}
