import { randomUUID } from "node:crypto";
import { mkdir, lstat, rename, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { normalizeSiteOrigin } from "./generate-route-pages.mjs";

const schemaVersion = 1;
const maxEvidenceBytes = 8 * 1024;
const maxCliArguments = 48;
const maxCliArgumentLength = 2048;
const checkStatuses = new Set([
  "pending",
  "success",
  "failure",
  "cancelled",
  "skipped",
]);
const sourceCheckNames = [
  "dependencyAudit",
  "sourceVerification",
  "build",
  "releaseManifest",
  "builtOutput",
];
const browserCheckNames = [
  "artifactVerification",
  "browserInstall",
  "browserTests",
  "lighthouse",
];
const sensitivePatterns = [
  /\/Users\//,
  /[A-Z]:\\Users\\/i,
  /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /npm_[A-Za-z0-9]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /(?:AKIA|ASIA)[A-Z0-9]{16}/,
  /sk_(?:live|test)_[A-Za-z0-9]{16,}/,
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/,
  /https?:\/\/[^\s/:@]+:[^\s/@]+@/i,
];

function assertPlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}

function assertExactKeys(value, expectedKeys, label) {
  assertPlainObject(value, label);
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    throw new Error(`${label} contains missing or unexpected fields`);
  }
}

function assertSafeString(value, label, maximumLength) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 31 || codePoint === 127;
    }) ||
    sensitivePatterns.some((pattern) => pattern.test(value))
  ) {
    throw new Error(`${label} is missing, malformed, sensitive, or unbounded`);
  }
  return value;
}

function repository(value) {
  const normalized = assertSafeString(value, "repository", 201);
  if (
    !/^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})\/[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})$/.test(
      normalized,
    )
  ) {
    throw new Error("repository must be an owner/name pair");
  }
  return normalized;
}

function gitObjectId(value, label) {
  const normalized = assertSafeString(value, label, 64).toLowerCase();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(normalized)) {
    throw new Error(`${label} must be a full Git object ID`);
  }
  return normalized;
}

function decimalId(value, label, maximumDigits = 20) {
  if (
    typeof value !== "string" ||
    !new RegExp(`^[1-9]\\d{0,${maximumDigits - 1}}$`).test(value)
  ) {
    throw new Error(`${label} must be a bounded positive decimal ID`);
  }
  return value;
}

function workflowAttempt(value) {
  const normalized = decimalId(value, "workflowRunAttempt", 4);
  return Number(normalized);
}

function artifactName(value) {
  const normalized = assertSafeString(value, "artifactName", 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized)) {
    throw new Error("artifactName contains unsupported characters");
  }
  return normalized;
}

function artifactDigest(value) {
  const normalized = assertSafeString(value, "artifactDigest", 71);
  const match = /^(?:sha256:)?([a-f0-9]{64})$/i.exec(normalized);
  if (!match) throw new Error("artifactDigest must be a SHA-256 digest");
  return `sha256:${match[1].toLowerCase()}`;
}

function publication(inputMode, inputOrigin) {
  if (inputMode !== "preview" && inputMode !== "production") {
    throw new Error("publicationMode must be preview or production");
  }

  if (inputMode === "preview") {
    if (inputOrigin !== null) {
      throw new Error("preview evidence must have a null siteOrigin");
    }
    return { mode: inputMode, siteOrigin: null };
  }

  const origin = assertSafeString(inputOrigin, "siteOrigin", 2048);
  let normalizedOrigin;
  try {
    normalizedOrigin = normalizeSiteOrigin(origin);
  } catch {
    throw new Error("siteOrigin must be a credential-free public HTTPS origin");
  }
  if (normalizedOrigin !== origin) {
    throw new Error("siteOrigin must be a credential-free public HTTPS origin");
  }
  return { mode: inputMode, siteOrigin: origin };
}

function commonRecord(input) {
  return {
    repository: repository(input.repository),
    source: {
      revision: gitObjectId(input.sourceRevision, "sourceRevision"),
      tree: gitObjectId(input.sourceTree, "sourceTree"),
    },
    workflow: {
      runId: decimalId(input.workflowRunId, "workflowRunId"),
      attempt: workflowAttempt(input.workflowRunAttempt),
    },
  };
}

function artifactRecord(input) {
  return {
    id: decimalId(input.artifactId, "artifactId"),
    name: artifactName(input.artifactName),
    digest: artifactDigest(input.artifactDigest),
  };
}

function checksRecord(input, names, label) {
  assertExactKeys(input, names, label);
  return Object.fromEntries(
    names.map((name) => {
      const status = input[name];
      if (!checkStatuses.has(status)) {
        throw new Error(`${label} contains an unsupported status`);
      }
      return [name, status];
    }),
  );
}

function summarizeChecks(checks, requiredSuccess, requiredSkipped = []) {
  const values = Object.values(checks);
  if (values.includes("failure")) return "failure";
  if (values.includes("cancelled")) return "cancelled";
  if (
    requiredSuccess.every((name) => checks[name] === "success") &&
    requiredSkipped.every((name) => checks[name] === "skipped")
  ) {
    return "success";
  }
  return "incomplete";
}

export function buildProvenanceRecord(input) {
  assertExactKeys(
    input,
    [
      "repository",
      "sourceRevision",
      "sourceTree",
      "workflowRunId",
      "workflowRunAttempt",
      "artifactId",
      "artifactName",
      "artifactDigest",
      "publicationMode",
      "siteOrigin",
    ],
    "provenance input",
  );
  return {
    schemaVersion,
    kind: "artifact-provenance",
    ...commonRecord(input),
    artifact: artifactRecord(input),
    publication: publication(input.publicationMode, input.siteOrigin),
    deployment: null,
    smokeTest: null,
  };
}

export function buildSourceEvidenceRecord(input) {
  assertExactKeys(
    input,
    [
      "repository",
      "sourceRevision",
      "sourceTree",
      "workflowRunId",
      "workflowRunAttempt",
      "checks",
    ],
    "source evidence input",
  );
  const checks = checksRecord(input.checks, sourceCheckNames, "source checks");
  return {
    schemaVersion,
    kind: "source-verification",
    ...commonRecord(input),
    status: summarizeChecks(checks, sourceCheckNames),
    checks,
  };
}

export function buildBrowserEvidenceRecord(input) {
  assertExactKeys(
    input,
    [
      "repository",
      "sourceRevision",
      "sourceTree",
      "workflowRunId",
      "workflowRunAttempt",
      "artifactId",
      "artifactName",
      "artifactDigest",
      "project",
      "checks",
    ],
    "browser evidence input",
  );
  if (!["chromium", "firefox", "webkit"].includes(input.project)) {
    throw new Error("project must be chromium, firefox, or webkit");
  }
  const checks = checksRecord(
    input.checks,
    browserCheckNames,
    "browser checks",
  );
  if (input.project !== "chromium" && checks.lighthouse === "success") {
    throw new Error("non-Chromium Lighthouse status must not report success");
  }
  const requiredSuccess = browserCheckNames.filter(
    (name) => name !== "lighthouse" || input.project === "chromium",
  );
  const requiredSkipped = input.project === "chromium" ? [] : ["lighthouse"];
  return {
    schemaVersion,
    kind: "browser-verification",
    ...commonRecord(input),
    artifact: artifactRecord(input),
    project: input.project,
    status: summarizeChecks(checks, requiredSuccess, requiredSkipped),
    checks,
  };
}

async function writeRecord(record, fileName, rootDirectory = process.cwd()) {
  const json = `${JSON.stringify(record, null, 2)}\n`;
  if (
    Buffer.byteLength(json) > maxEvidenceBytes ||
    sensitivePatterns.some((pattern) => pattern.test(json))
  ) {
    throw new Error("evidence output is sensitive or exceeds its size bound");
  }

  const evidenceDirectory = resolve(rootDirectory, "evidence");
  await mkdir(evidenceDirectory, { recursive: true });
  if ((await lstat(evidenceDirectory)).isSymbolicLink()) {
    throw new Error("evidence output directory must not be a symbolic link");
  }

  const outputPath = resolve(evidenceDirectory, fileName);
  const temporaryPath = resolve(
    evidenceDirectory,
    `.${fileName}.${process.pid}-${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, json, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
  return outputPath;
}

export function writeProvenanceEvidence(input, options = {}) {
  const rootDirectory = writerRoot(options);
  return writeRecord(
    buildProvenanceRecord(input),
    "provenance.json",
    rootDirectory,
  );
}

export function writeSourceEvidence(input, options = {}) {
  const rootDirectory = writerRoot(options);
  return writeRecord(
    buildSourceEvidenceRecord(input),
    "source-verification.json",
    rootDirectory,
  );
}

export function writeBrowserEvidence(input, options = {}) {
  const rootDirectory = writerRoot(options);
  const record = buildBrowserEvidenceRecord(input);
  return writeRecord(record, `browser-${record.project}.json`, rootDirectory);
}

function writerRoot(options) {
  assertPlainObject(options, "writer options");
  const keys = Object.keys(options);
  if (keys.some((key) => key !== "rootDirectory")) {
    throw new Error("writer options contain unexpected fields");
  }
  const rootDirectory = options.rootDirectory ?? process.cwd();
  if (
    typeof rootDirectory !== "string" ||
    rootDirectory.length === 0 ||
    rootDirectory.length > 4096
  ) {
    throw new Error("rootDirectory must be a bounded path string");
  }
  return rootDirectory;
}

function parseOptions(argumentsList, allowedOptions) {
  if (
    argumentsList.length > maxCliArguments ||
    argumentsList.some((argument) => argument.length > maxCliArgumentLength) ||
    argumentsList.length % 2 !== 0
  ) {
    throw new Error("CLI input is malformed or unbounded");
  }
  const parsed = new Map();
  for (let index = 0; index < argumentsList.length; index += 2) {
    const name = argumentsList[index];
    if (!allowedOptions.has(name) || parsed.has(name)) {
      throw new Error("CLI input contains an unexpected or duplicate option");
    }
    parsed.set(name, argumentsList[index + 1]);
  }
  return parsed;
}

const commonCliOptions = new Set([
  "--repository",
  "--source-revision",
  "--source-tree",
  "--workflow-run-id",
  "--workflow-run-attempt",
]);

function commonCliInput(options) {
  return {
    repository: options.get("--repository"),
    sourceRevision: options.get("--source-revision"),
    sourceTree: options.get("--source-tree"),
    workflowRunId: options.get("--workflow-run-id"),
    workflowRunAttempt: options.get("--workflow-run-attempt"),
  };
}

function pendingChecks(names, options, optionNames) {
  return Object.fromEntries(
    names.map((name) => [name, options.get(optionNames[name]) ?? "pending"]),
  );
}

async function runCli([command, ...argumentsList]) {
  if (command === "provenance") {
    const allowed = new Set([
      ...commonCliOptions,
      "--artifact-id",
      "--artifact-name",
      "--artifact-digest",
      "--publication-mode",
      "--site-origin",
    ]);
    const options = parseOptions(argumentsList, allowed);
    const publicationMode = options.get("--publication-mode");
    return writeProvenanceEvidence({
      ...commonCliInput(options),
      artifactId: options.get("--artifact-id"),
      artifactName: options.get("--artifact-name"),
      artifactDigest: options.get("--artifact-digest"),
      publicationMode,
      siteOrigin: options.get("--site-origin") ?? null,
    });
  }

  if (command === "source") {
    const optionNames = {
      dependencyAudit: "--dependency-audit",
      sourceVerification: "--source-verification",
      build: "--build",
      releaseManifest: "--release-manifest",
      builtOutput: "--built-output",
    };
    const options = parseOptions(
      argumentsList,
      new Set([...commonCliOptions, ...Object.values(optionNames)]),
    );
    return writeSourceEvidence({
      ...commonCliInput(options),
      checks: pendingChecks(sourceCheckNames, options, optionNames),
    });
  }

  if (command === "browser") {
    const optionNames = {
      artifactVerification: "--artifact-verification",
      browserInstall: "--browser-install",
      browserTests: "--browser-tests",
      lighthouse: "--lighthouse",
    };
    const options = parseOptions(
      argumentsList,
      new Set([
        ...commonCliOptions,
        "--artifact-id",
        "--artifact-name",
        "--artifact-digest",
        "--project",
        ...Object.values(optionNames),
      ]),
    );
    return writeBrowserEvidence({
      ...commonCliInput(options),
      artifactId: options.get("--artifact-id"),
      artifactName: options.get("--artifact-name"),
      artifactDigest: options.get("--artifact-digest"),
      project: options.get("--project"),
      checks: pendingChecks(browserCheckNames, options, optionNames),
    });
  }

  throw new Error("expected provenance, source, or browser command");
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  runCli(process.argv.slice(2))
    .then((outputPath) => {
      console.log(`Wrote bounded CI evidence (${basename(outputPath)})`);
    })
    .catch((error) => {
      console.error(`CI evidence error: ${error.message}`);
      process.exitCode = 1;
    });
}
