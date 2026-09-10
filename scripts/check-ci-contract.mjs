import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WORKFLOW_PATH = ".github/workflows/ci.yml";
const ACTIONS = Object.freeze({
  checkout: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  download:
    "actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c",
  node: "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
  pnpm: "pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413",
  upload: "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
});

const JOB_NAMES = ["build", "artifact-contract", "browser"];
const CANDIDATE_NAME =
  "papaya-build-${{ github.sha }}-${{ github.run_attempt }}";
const ARTIFACT_ID = "${{ needs.build.outputs.artifact-id }}";
const SOURCE_EVIDENCE_NAME =
  "source-evidence-${{ github.sha }}-${{ github.run_attempt }}";
const BROWSER_EVIDENCE_NAME =
  "browser-evidence-${{ matrix.project }}-${{ github.sha }}-${{ github.run_attempt }}";
const COMMON_EVIDENCE_ARGUMENTS = [
  '--repository "${{ github.repository }}"',
  '--source-revision "${{ github.sha }}"',
  '--workflow-run-id "${{ github.run_id }}"',
  '--workflow-run-attempt "${{ github.run_attempt }}"',
];
const BUILD_EVIDENCE_ARGUMENTS = [
  ...COMMON_EVIDENCE_ARGUMENTS.slice(0, 2),
  '--source-tree "${{ steps.source.outputs.tree }}"',
  ...COMMON_EVIDENCE_ARGUMENTS.slice(2),
].join(" ");
const BROWSER_EVIDENCE_ARGUMENTS = [
  ...COMMON_EVIDENCE_ARGUMENTS.slice(0, 2),
  '--source-tree "${{ needs.build.outputs.source-tree }}"',
  ...COMMON_EVIDENCE_ARGUMENTS.slice(2),
].join(" ");
const SOURCE_IDENTITY =
  'echo "tree=$(git rev-parse HEAD^{tree})" >> "$GITHUB_OUTPUT"';
const SOURCE_EVIDENCE = `node scripts/write-ci-evidence.mjs source ${BUILD_EVIDENCE_ARGUMENTS}`;
const SOURCE_EVIDENCE_FINAL = [
  SOURCE_EVIDENCE,
  "--dependency-audit \"${{ steps.dependency-audit.outcome || 'skipped' }}\"",
  "--source-verification \"${{ steps.source-verification.outcome || 'skipped' }}\"",
  "--build \"${{ steps.candidate-build.outcome || 'skipped' }}\"",
  "--release-manifest \"${{ steps.release-manifest.outcome || 'skipped' }}\"",
  "--built-output \"${{ steps.built-output.outcome || 'skipped' }}\"",
].join(" ");
const PROVENANCE_EVIDENCE = [
  `node scripts/write-ci-evidence.mjs provenance ${BUILD_EVIDENCE_ARGUMENTS}`,
  '--artifact-id "${{ steps.build-artifact.outputs.artifact-id }}"',
  `--artifact-name "${CANDIDATE_NAME}"`,
  '--artifact-digest "${{ steps.build-artifact.outputs.artifact-digest }}"',
  "--publication-mode preview",
].join(" ");
const BROWSER_EVIDENCE = [
  `node scripts/write-ci-evidence.mjs browser ${BROWSER_EVIDENCE_ARGUMENTS}`,
  `--artifact-id "${ARTIFACT_ID}"`,
  `--artifact-name "${CANDIDATE_NAME}"`,
  '--artifact-digest "${{ needs.build.outputs.artifact-digest }}"',
  '--project "${{ matrix.project }}"',
].join(" ");
const BROWSER_EVIDENCE_FINAL = [
  BROWSER_EVIDENCE,
  "--artifact-verification \"${{ steps.artifact-verification.outcome || 'skipped' }}\"",
  "--browser-install \"${{ steps.browser-install.outcome || 'skipped' }}\"",
  "--browser-tests \"${{ steps.browser-tests.outcome || 'skipped' }}\"",
  "--lighthouse \"${{ steps.lighthouse.outcome || 'skipped' }}\"",
].join(" ");

class WorkflowSyntaxError extends Error {
  constructor(message, line) {
    super(`line ${line}: ${message}`);
    this.name = "WorkflowSyntaxError";
  }
}

function stripInlineComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "#" && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value.trimEnd();
}

function indentation(line, lineNumber) {
  const prefix = line.match(/^[\t ]*/)?.[0] ?? "";
  if (prefix.includes("\t")) {
    throw new WorkflowSyntaxError(
      "tabs are not allowed for indentation",
      lineNumber,
    );
  }
  return prefix.length;
}

function tokenize(source) {
  let forbiddenControlIndex = -1;
  let sourceIndex = 0;
  for (const character of source) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint <= 8 ||
      codePoint === 11 ||
      codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) ||
      (codePoint >= 127 && codePoint <= 159) ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
      codePoint === 0xfffe ||
      codePoint === 0xffff
    ) {
      forbiddenControlIndex = sourceIndex;
      break;
    }
    sourceIndex += character.length;
  }
  if (forbiddenControlIndex >= 0) {
    const line = source
      .slice(0, forbiddenControlIndex)
      .split(/\r\n|\r|\n/).length;
    throw new WorkflowSyntaxError("forbidden YAML control character", line);
  }
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const tokens = [];

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const lineNumber = index + 1;
    const indent = indentation(raw, lineNumber);
    const text = stripInlineComment(raw.slice(indent));
    if (text.trim() === "") continue;

    const blockMatch = text.match(/(?:^|:\s*)([|>])[-+]?\s*$/);
    let block;
    if (blockMatch) {
      const blockLines = [];
      let next = index + 1;
      let contentIndent = Number.POSITIVE_INFINITY;
      while (next < lines.length) {
        const candidate = lines[next];
        const candidateIndent = indentation(candidate, next + 1);
        if (candidate.trim() !== "" && candidateIndent <= indent) break;
        if (candidate.trim() !== "") {
          contentIndent = Math.min(contentIndent, candidateIndent);
        }
        blockLines.push(candidate);
        next += 1;
      }
      if (Number.isFinite(contentIndent)) {
        block = blockLines
          .map((line) => (line.trim() === "" ? "" : line.slice(contentIndent)))
          .join(blockMatch[1] === ">" ? " " : "\n")
          .trimEnd();
      } else {
        block = "";
      }
      index = next - 1;
    }

    tokens.push({ block, indent, line: lineNumber, text: text.trim() });
  }
  return tokens;
}

function splitInlineList(value, line) {
  const body = value.slice(1, -1).trim();
  if (body === "") return [];
  const parts = [];
  let quote = null;
  let start = 0;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (quote) {
      if (character === quote && body[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    if (character === ",") {
      parts.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quote) throw new WorkflowSyntaxError("unterminated quoted scalar", line);
  parts.push(body.slice(start).trim());
  return parts.map((part) => parseScalar(part, line));
}

function parseScalar(value, line) {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return splitInlineList(trimmed, line);
  }
  if (/^(?:true|false)$/i.test(trimmed))
    return trimmed.toLowerCase() === "true";
  if (/^(?:null|~)$/i.test(trimmed)) return null;
  if (/^-?(?:0|[1-9]\d*)$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new WorkflowSyntaxError("invalid double-quoted scalar", line);
    }
  }
  if (trimmed.startsWith("'")) {
    if (!trimmed.endsWith("'") || trimmed.length < 2) {
      throw new WorkflowSyntaxError("unterminated single-quoted scalar", line);
    }
    const inner = trimmed.slice(1, -1);
    if (inner.replaceAll("''", "").includes("'")) {
      throw new WorkflowSyntaxError("invalid single-quoted scalar", line);
    }
    return inner.replaceAll("''", "'");
  }
  if (/^(?:&|\*)[^\s]+/.test(trimmed)) {
    throw new WorkflowSyntaxError(
      "YAML anchors and aliases are not supported",
      line,
    );
  }
  if (
    "!&*{},[]#|>@`%".includes(trimmed[0]) ||
    /^(?:-|\?|:)(?:\s|$)/.test(trimmed) ||
    /:(?:\s|$)/.test(trimmed)
  ) {
    throw new WorkflowSyntaxError("invalid plain scalar", line);
  }
  return trimmed;
}

function keyValue(text, line) {
  const match = text.match(/^([A-Za-z0-9_.${}/-]+):(?:\s*(.*))?$/);
  if (!match) throw new WorkflowSyntaxError("expected a mapping entry", line);
  if (match[1] === "<<") {
    throw new WorkflowSyntaxError("YAML merge keys are not supported", line);
  }
  return { key: match[1], rawValue: match[2] ?? "" };
}

function setUnique(target, key, value, line) {
  if (Object.hasOwn(target, key)) {
    throw new WorkflowSyntaxError(`duplicate key ${key}`, line);
  }
  target[key] = value;
}

function parseTokens(tokens) {
  function parseBlock(start, indent) {
    if (tokens[start]?.indent !== indent) {
      throw new WorkflowSyntaxError(
        "invalid indentation",
        tokens[start]?.line ?? 1,
      );
    }
    return tokens[start].text.startsWith("-")
      ? parseSequence(start, indent)
      : parseMapping(start, indent);
  }

  function parseMapping(start, indent) {
    const result = {};
    let index = start;
    while (
      index < tokens.length &&
      tokens[index].indent === indent &&
      !tokens[index].text.startsWith("-")
    ) {
      const token = tokens[index];
      const { key, rawValue } = keyValue(token.text, token.line);
      let value;
      index += 1;
      if (token.block !== undefined) {
        value = token.block;
      } else if (rawValue !== "") {
        value = parseScalar(rawValue, token.line);
      } else if (index < tokens.length && tokens[index].indent > indent) {
        [value, index] = parseBlock(index, tokens[index].indent);
      } else {
        value = null;
      }
      setUnique(result, key, value, token.line);
    }
    return [result, index];
  }

  function parseSequence(start, indent) {
    const result = [];
    let index = start;
    while (
      index < tokens.length &&
      tokens[index].indent === indent &&
      tokens[index].text.startsWith("-")
    ) {
      const token = tokens[index];
      const rest = token.text.slice(1).trim();
      index += 1;
      if (rest === "") {
        if (index >= tokens.length || tokens[index].indent <= indent) {
          result.push(null);
        } else {
          let value;
          [value, index] = parseBlock(index, tokens[index].indent);
          result.push(value);
        }
        continue;
      }
      if (!rest.includes(":")) {
        result.push(parseScalar(rest, token.line));
        continue;
      }

      const item = {};
      const propertyIndent = indent + 2;
      const { key, rawValue } = keyValue(rest, token.line);
      let value;
      if (token.block !== undefined) {
        value = token.block;
      } else if (rawValue !== "") {
        value = parseScalar(rawValue, token.line);
      } else if (
        index < tokens.length &&
        tokens[index].indent > propertyIndent
      ) {
        [value, index] = parseBlock(index, tokens[index].indent);
      } else {
        value = null;
      }
      setUnique(item, key, value, token.line);

      if (
        index < tokens.length &&
        tokens[index].indent === propertyIndent &&
        !tokens[index].text.startsWith("-")
      ) {
        let continuation;
        [continuation, index] = parseMapping(index, propertyIndent);
        for (const [continuationKey, continuationValue] of Object.entries(
          continuation,
        )) {
          setUnique(item, continuationKey, continuationValue, token.line);
        }
      }
      result.push(item);
    }
    return [result, index];
  }

  if (tokens.length === 0) return {};
  const [result, next] = parseBlock(0, tokens[0].indent);
  if (next !== tokens.length) {
    throw new WorkflowSyntaxError(
      "could not parse the complete workflow",
      tokens[next].line,
    );
  }
  return result;
}

export function parseWorkflow(source) {
  return parseTokens(tokenize(source));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameKeys(actual, expected) {
  if (!isObject(actual)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = [...expected].sort();
  return JSON.stringify(actualKeys) === JSON.stringify(expectedKeys);
}

function exactObject(actual, expected) {
  if (!sameKeys(actual, Object.keys(expected))) return false;
  return Object.entries(expected).every(
    ([key, value]) => JSON.stringify(actual[key]) === JSON.stringify(value),
  );
}

function normalizeCondition(value) {
  return String(value)
    .trim()
    .replace(/^\$\{\{\s*/, "")
    .replace(/\s*}}$/, "")
    .replace(/^\((.*)\)$/, "$1")
    .trim()
    .toLowerCase();
}

function isAlways(value) {
  return normalizeCondition(value) === "always()";
}

function hasDeadCondition(value) {
  return ["false", "0", "null", "!true", "! true"].includes(
    normalizeCondition(value),
  );
}

function allNodes(value, visit, path = "workflow") {
  visit(value, path);
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      allNodes(child, visit, `${path}[${index}]`),
    );
  } else if (isObject(value)) {
    Object.entries(value).forEach(([key, child]) =>
      allNodes(child, visit, `${path}.${key}`),
    );
  }
}

function exactStepAction(step, action, withFields) {
  return (
    isObject(step) &&
    step.uses === action &&
    (withFields === undefined || exactObject(step.with, withFields))
  );
}

function expectSingleStep(failures, steps, description, predicate) {
  const matches = steps.filter(predicate);
  if (matches.length !== 1) {
    failures.push(`${description} must appear exactly once`);
    return null;
  }
  return matches[0];
}

function indexOfStep(steps, predicate) {
  return steps.findIndex((step) => isObject(step) && predicate(step));
}

function assertOrder(failures, steps, jobName, predicates) {
  const indexes = predicates.map(({ predicate }) =>
    indexOfStep(steps, predicate),
  );
  const missing = indexes.findIndex((index) => index < 0);
  if (missing >= 0) {
    failures.push(`${jobName} is missing ${predicates[missing].label}`);
    return;
  }
  if (
    indexes.some(
      (index, position) => position > 0 && index <= indexes[position - 1],
    )
  ) {
    failures.push(`${jobName} steps are not in the required order`);
  }
}

function validatePinnedAction(failures, uses, location) {
  if (uses.startsWith("docker://")) {
    if (!/^docker:\/\/[^\s@]+@sha256:[a-f0-9]{64}$/.test(uses)) {
      failures.push(
        `${location} Docker reference is not pinned by SHA-256 digest`,
      );
    }
    return;
  }
  if (!/^[^\s@]+@[a-f0-9]{40}$/.test(uses)) {
    failures.push(`${location} action is not pinned to a full commit SHA`);
  }
}

function validateCommonSetup(failures, jobName, steps) {
  const setup = [
    {
      action: ACTIONS.checkout,
      label: "checkout",
      with: { "fetch-depth": 0, "persist-credentials": false },
    },
    {
      action: ACTIONS.pnpm,
      label: "pnpm setup",
      with: { run_install: false, version: "11.19.0" },
    },
    {
      action: ACTIONS.node,
      label: "Node setup",
      with: { cache: "pnpm", "node-version-file": ".node-version" },
    },
  ];
  for (const expected of setup) {
    expectSingleStep(failures, steps, `${jobName} ${expected.label}`, (step) =>
      exactStepAction(step, expected.action, expected.with),
    );
  }
  assertOrder(
    failures,
    steps,
    jobName,
    setup.map((expected) => ({
      label: expected.label,
      predicate: (step) => step.uses === expected.action,
    })),
  );
}

function validateDownload(failures, jobName, steps) {
  return expectSingleStep(
    failures,
    steps,
    `${jobName} exact artifact-ID download`,
    (step) =>
      exactStepAction(step, ACTIONS.download, {
        "artifact-ids": ARTIFACT_ID,
        "digest-mismatch": "error",
        path: "dist",
      }),
  );
}

function validateCandidateUpload(failures, steps) {
  const upload = expectSingleStep(
    failures,
    steps,
    "build immutable candidate upload",
    (step) =>
      isObject(step) &&
      step.id === "build-artifact" &&
      exactStepAction(step, ACTIONS.upload, {
        "if-no-files-found": "error",
        "include-hidden-files": false,
        name: CANDIDATE_NAME,
        overwrite: false,
        path: "dist/",
        "retention-days": 14,
      }),
  );
  if (upload && Object.hasOwn(upload, "if")) {
    failures.push("candidate upload must not be conditional");
  }
  return upload;
}

function validateSourceEvidenceUpload(failures, steps) {
  return expectSingleStep(
    failures,
    steps,
    "build source evidence upload",
    (step) =>
      isObject(step) &&
      isAlways(step.if) &&
      exactStepAction(step, ACTIONS.upload, {
        "if-no-files-found": "error",
        "include-hidden-files": false,
        name: SOURCE_EVIDENCE_NAME,
        overwrite: false,
        path: "evidence/source-verification.json\nevidence/provenance.json",
        "retention-days": 14,
      }),
  );
}

function validateBrowserEvidenceUpload(failures, steps) {
  return expectSingleStep(
    failures,
    steps,
    "browser bounded evidence upload",
    (step) =>
      isObject(step) &&
      isAlways(step.if) &&
      exactStepAction(step, ACTIONS.upload, {
        "if-no-files-found": "error",
        "include-hidden-files": false,
        name: BROWSER_EVIDENCE_NAME,
        overwrite: false,
        path: [
          "playwright-report/",
          "test-results/",
          "evidence/browser-${{ matrix.project }}.json",
          "evidence/lighthouse/",
        ].join("\n"),
        "retention-days": 7,
      }),
  );
}

function runSteps(steps) {
  return steps.filter((step) => isObject(step) && Object.hasOwn(step, "run"));
}

function actionIdentity(uses, id = "", artifactName = "") {
  return `uses:${uses}:${id}:${artifactName}`;
}

function executableIdentity(step) {
  if (!isObject(step)) return "invalid";
  if (Object.hasOwn(step, "run")) return `run:${step.run}`;
  if (Object.hasOwn(step, "uses")) {
    return actionIdentity(step.uses, step.id ?? "", step.with?.name ?? "");
  }
  return "invalid";
}

function validateExactRuns(
  failures,
  jobName,
  steps,
  expected,
  allowedEvidence = [],
) {
  const runs = runSteps(steps);
  const allowed = new Set([...expected, ...allowedEvidence]);
  for (const step of runs) {
    if (typeof step.run !== "string" || !allowed.has(step.run)) {
      failures.push(
        `${jobName} contains an unapproved command: ${String(step.run)}`,
      );
    }
  }
  for (const command of expected) {
    const count = runs.filter((step) => step.run === command).length;
    if (count !== 1) {
      failures.push(`${jobName} must run exactly once: ${command}`);
    }
  }
}

function validateUploadPath(failures, step, description) {
  const path = step.with?.path;
  if (typeof path !== "string") {
    failures.push(`${description} must use an explicit artifact path`);
    return;
  }
  for (const entry of path
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)) {
    const isAllowedDynamicBrowserEvidence =
      entry === "evidence/browser-${{ matrix.project }}.json";
    if (
      entry === "." ||
      entry === "/" ||
      entry.includes("..") ||
      (!isAllowedDynamicBrowserEvidence &&
        (/[*?{}]/.test(entry) || entry.includes("${{")))
    ) {
      failures.push(
        `${description} contains a broad or dynamic artifact path: ${entry}`,
      );
    }
  }
}

export function validateCiContract(source) {
  const failures = [];
  let workflow;
  try {
    workflow = parseWorkflow(source);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  if (!isObject(workflow)) return ["workflow root must be a mapping"];
  if (
    !sameKeys(workflow, ["name", "on", "permissions", "concurrency", "jobs"])
  ) {
    failures.push(
      "workflow root fields must be exactly name, on, permissions, concurrency, and jobs",
    );
  }
  if (workflow.name !== "CI") failures.push("workflow name must be CI");
  if (
    !exactObject(workflow.on, {
      pull_request: null,
      push: { branches: ["main"] },
    })
  ) {
    failures.push(
      "workflow triggers must be pull requests and pushes to main only",
    );
  }
  if (Object.hasOwn(workflow.on ?? {}, "pull_request_target")) {
    failures.push("pull_request_target is forbidden for verification CI");
  }
  if (!exactObject(workflow.permissions, { contents: "read" })) {
    failures.push("workflow permissions must be exactly contents: read");
  }
  if (
    !exactObject(workflow.concurrency, {
      "cancel-in-progress": true,
      group: "ci-${{ github.workflow }}-${{ github.ref }}",
    })
  ) {
    failures.push("workflow concurrency must cancel superseded runs by ref");
  }
  if (!isObject(workflow.jobs) || !sameKeys(workflow.jobs, JOB_NAMES)) {
    failures.push(`workflow jobs must be exactly: ${JOB_NAMES.join(", ")}`);
  }

  const jobs = workflow.jobs ?? {};
  const jobSteps = {};
  for (const jobName of JOB_NAMES) {
    const job = jobs[jobName];
    if (!isObject(job)) {
      failures.push(`${jobName} job is missing or invalid`);
      jobSteps[jobName] = [];
      continue;
    }
    if (job["runs-on"] !== "ubuntu-24.04") {
      failures.push(`${jobName} must run on ubuntu-24.04`);
    }
    if (!Array.isArray(job.steps)) {
      failures.push(`${jobName} steps must be a sequence`);
      jobSteps[jobName] = [];
    } else {
      jobSteps[jobName] = job.steps;
    }
    if (hasDeadCondition(job.if)) {
      failures.push(`${jobName} has an always-false condition`);
    }
    if (
      Object.hasOwn(job, "permissions") ||
      Object.hasOwn(job, "container") ||
      Object.hasOwn(job, "services")
    ) {
      failures.push(
        `${jobName} must not override permissions or add containers/services`,
      );
    }
  }

  const build = jobs.build ?? {};
  const artifact = jobs["artifact-contract"] ?? {};
  const browser = jobs.browser ?? {};
  const jobShapes = {
    build: {
      fields: ["name", "runs-on", "timeout-minutes", "outputs", "steps"],
      name: "Build and verify source",
      timeout: 20,
    },
    "artifact-contract": {
      fields: ["name", "needs", "runs-on", "timeout-minutes", "steps"],
      name: "Verify downloaded artifact",
      timeout: 15,
    },
    browser: {
      fields: [
        "name",
        "needs",
        "runs-on",
        "timeout-minutes",
        "strategy",
        "steps",
      ],
      name: "Browser (${{ matrix.project }})",
      timeout: 25,
    },
  };
  for (const [jobName, shape] of Object.entries(jobShapes)) {
    const job = jobs[jobName];
    if (!isObject(job)) continue;
    if (!sameKeys(job, shape.fields)) {
      failures.push(
        `${jobName} contains fields outside its exact job contract`,
      );
    }
    if (job.name !== shape.name || job["timeout-minutes"] !== shape.timeout) {
      failures.push(`${jobName} name or timeout differs from its job contract`);
    }
  }
  if (Object.hasOwn(build, "needs")) {
    failures.push("build must not depend on another job");
  }
  if (artifact.needs !== "build") {
    failures.push("artifact-contract must need build");
  }
  if (
    !Array.isArray(browser.needs) ||
    JSON.stringify(browser.needs) !==
      JSON.stringify(["build", "artifact-contract"])
  ) {
    failures.push(
      "browser must need build and artifact-contract, in that order",
    );
  }
  if (
    !exactObject(build.outputs, {
      "artifact-digest": "${{ steps.build-artifact.outputs.artifact-digest }}",
      "artifact-id": "${{ steps.build-artifact.outputs.artifact-id }}",
      "source-tree": "${{ steps.source.outputs.tree }}",
    })
  ) {
    failures.push(
      "build must expose the candidate artifact ID and digest exactly",
    );
  }
  if (
    !exactObject(browser.strategy, {
      "fail-fast": false,
      matrix: { project: ["chromium", "firefox", "webkit"] },
    })
  ) {
    failures.push(
      "browser matrix must be exactly chromium, firefox, and webkit",
    );
  }

  for (const [jobName, steps] of Object.entries(jobSteps)) {
    const stepIds = new Set();
    for (const [index, step] of steps.entries()) {
      const location = `${jobName} step ${index + 1}`;
      if (!isObject(step)) {
        failures.push(`${location} must be a mapping`);
        continue;
      }
      if (
        !Object.keys(step).every((key) =>
          ["name", "id", "uses", "with", "run", "if"].includes(key),
        )
      ) {
        failures.push(`${location} contains fields outside the step contract`);
      }
      if (typeof step.name !== "string" || step.name.trim() === "") {
        failures.push(`${location} must have a non-empty name`);
      }
      const executableFields = ["uses", "run"].filter((key) =>
        Object.hasOwn(step, key),
      );
      if (executableFields.length !== 1) {
        failures.push(`${location} must have exactly one of uses or run`);
      }
      if (Object.hasOwn(step, "with") && !Object.hasOwn(step, "uses")) {
        failures.push(`${location} cannot use with without an action`);
      }
      if (Object.hasOwn(step, "id")) {
        if (typeof step.id !== "string" || stepIds.has(step.id)) {
          failures.push(`${jobName} step IDs must be non-empty and unique`);
        }
        stepIds.add(step.id);
      }
      if (
        Object.hasOwn(step, "if") &&
        !isAlways(step.if) &&
        !(
          jobName === "browser" &&
          step.run === "pnpm performance:lighthouse" &&
          step.if === "matrix.project == 'chromium'"
        )
      ) {
        failures.push(`${location} has an unapproved condition`);
      }
    }
  }

  for (const jobName of JOB_NAMES) {
    validateCommonSetup(failures, jobName, jobSteps[jobName]);
  }

  const install = "pnpm install --frozen-lockfile";
  const releaseVerify = "pnpm release:verify";
  const distVerify = "pnpm verify:dist";
  validateExactRuns(failures, "build", jobSteps.build, [
    SOURCE_IDENTITY,
    SOURCE_EVIDENCE,
    install,
    "pnpm audit --audit-level=moderate",
    "pnpm verify:source",
    "pnpm build",
    releaseVerify,
    distVerify,
    PROVENANCE_EVIDENCE,
    SOURCE_EVIDENCE_FINAL,
  ]);
  validateExactRuns(
    failures,
    "artifact-contract",
    jobSteps["artifact-contract"],
    [install, releaseVerify, distVerify],
  );
  validateExactRuns(failures, "browser", jobSteps.browser, [
    BROWSER_EVIDENCE,
    install,
    releaseVerify,
    "pnpm exec playwright install --with-deps ${{ matrix.project }}",
    "pnpm test:e2e --project=${{ matrix.project }}",
    "pnpm performance:lighthouse",
    BROWSER_EVIDENCE_FINAL,
  ]);

  const sensitiveCommands = new Map([
    ["pnpm audit --audit-level=moderate", ["build"]],
    ["pnpm verify:source", ["build"]],
    ["pnpm build", ["build"]],
    [distVerify, ["build", "artifact-contract"]],
    [releaseVerify, JOB_NAMES],
    [
      "pnpm exec playwright install --with-deps ${{ matrix.project }}",
      ["browser"],
    ],
    ["pnpm test:e2e --project=${{ matrix.project }}", ["browser"]],
    ["pnpm performance:lighthouse", ["browser"]],
  ]);
  for (const [jobName, steps] of Object.entries(jobSteps)) {
    for (const step of runSteps(steps)) {
      const owners = sensitiveCommands.get(step.run);
      if (owners && !owners.includes(jobName)) {
        failures.push(`${step.run} is misplaced in ${jobName}`);
      }
    }
  }

  const buildSteps = jobSteps.build;
  const artifactSteps = jobSteps["artifact-contract"];
  const browserSteps = jobSteps.browser;
  validateCandidateUpload(failures, buildSteps);
  validateSourceEvidenceUpload(failures, buildSteps);
  validateDownload(failures, "artifact-contract", artifactSteps);
  validateDownload(failures, "browser", browserSteps);
  validateBrowserEvidenceUpload(failures, browserSteps);

  const expectedExecutableSequences = {
    build: [
      actionIdentity(ACTIONS.checkout),
      actionIdentity(ACTIONS.pnpm),
      actionIdentity(ACTIONS.node),
      `run:${SOURCE_IDENTITY}`,
      `run:${SOURCE_EVIDENCE}`,
      `run:${install}`,
      "run:pnpm audit --audit-level=moderate",
      "run:pnpm verify:source",
      "run:pnpm build",
      `run:${releaseVerify}`,
      `run:${distVerify}`,
      actionIdentity(ACTIONS.upload, "build-artifact", CANDIDATE_NAME),
      `run:${PROVENANCE_EVIDENCE}`,
      `run:${SOURCE_EVIDENCE_FINAL}`,
      actionIdentity(ACTIONS.upload, "", SOURCE_EVIDENCE_NAME),
    ],
    "artifact-contract": [
      actionIdentity(ACTIONS.checkout),
      actionIdentity(ACTIONS.pnpm),
      actionIdentity(ACTIONS.node),
      `run:${install}`,
      actionIdentity(ACTIONS.download),
      `run:${releaseVerify}`,
      `run:${distVerify}`,
    ],
    browser: [
      actionIdentity(ACTIONS.checkout),
      actionIdentity(ACTIONS.pnpm),
      actionIdentity(ACTIONS.node),
      `run:${BROWSER_EVIDENCE}`,
      `run:${install}`,
      actionIdentity(ACTIONS.download),
      `run:${releaseVerify}`,
      "run:pnpm exec playwright install --with-deps ${{ matrix.project }}",
      "run:pnpm test:e2e --project=${{ matrix.project }}",
      "run:pnpm performance:lighthouse",
      `run:${BROWSER_EVIDENCE_FINAL}`,
      actionIdentity(ACTIONS.upload, "", BROWSER_EVIDENCE_NAME),
    ],
  };
  for (const [jobName, expected] of Object.entries(
    expectedExecutableSequences,
  )) {
    const actual = jobSteps[jobName].map(executableIdentity);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(
        `${jobName} executable step sequence differs from its exact contract`,
      );
    }
  }

  assertOrder(failures, buildSteps, "build", [
    {
      label: "source evidence initialization",
      predicate: (step) => step.run === SOURCE_EVIDENCE,
    },
    { label: "dependency install", predicate: (step) => step.run === install },
    {
      label: "dependency audit",
      predicate: (step) => step.run === "pnpm audit --audit-level=moderate",
    },
    {
      label: "source verification",
      predicate: (step) => step.run === "pnpm verify:source",
    },
    { label: "the only build", predicate: (step) => step.run === "pnpm build" },
    {
      label: "release verification",
      predicate: (step) => step.run === releaseVerify,
    },
    {
      label: "dist verification",
      predicate: (step) => step.run === distVerify,
    },
    {
      label: "candidate upload",
      predicate: (step) => step.id === "build-artifact",
    },
    {
      label: "artifact provenance",
      predicate: (step) => step.run === PROVENANCE_EVIDENCE,
    },
    {
      label: "source evidence finalization",
      predicate: (step) => step.run === SOURCE_EVIDENCE_FINAL,
    },
    {
      label: "source evidence upload",
      predicate: (step) =>
        step.uses === ACTIONS.upload &&
        step.with?.name === SOURCE_EVIDENCE_NAME,
    },
  ]);
  assertOrder(failures, artifactSteps, "artifact-contract", [
    { label: "dependency install", predicate: (step) => step.run === install },
    {
      label: "candidate download",
      predicate: (step) => step.uses === ACTIONS.download,
    },
    {
      label: "release verification",
      predicate: (step) => step.run === releaseVerify,
    },
    {
      label: "dist verification",
      predicate: (step) => step.run === distVerify,
    },
  ]);
  assertOrder(failures, browserSteps, "browser", [
    {
      label: "browser evidence initialization",
      predicate: (step) => step.run === BROWSER_EVIDENCE,
    },
    { label: "dependency install", predicate: (step) => step.run === install },
    {
      label: "candidate download",
      predicate: (step) => step.uses === ACTIONS.download,
    },
    {
      label: "release verification",
      predicate: (step) => step.run === releaseVerify,
    },
    {
      label: "browser install",
      predicate: (step) =>
        step.run ===
        "pnpm exec playwright install --with-deps ${{ matrix.project }}",
    },
    {
      label: "browser tests",
      predicate: (step) =>
        step.run === "pnpm test:e2e --project=${{ matrix.project }}",
    },
    {
      label: "Lighthouse",
      predicate: (step) => step.run === "pnpm performance:lighthouse",
    },
    {
      label: "browser evidence finalization",
      predicate: (step) => step.run === BROWSER_EVIDENCE_FINAL,
    },
    {
      label: "browser evidence upload",
      predicate: (step) =>
        step.uses === ACTIONS.upload &&
        step.with?.name === BROWSER_EVIDENCE_NAME,
    },
  ]);

  const lighthouse = browserSteps.find(
    (step) => step.run === "pnpm performance:lighthouse",
  );
  if (lighthouse?.if !== "matrix.project == 'chromium'") {
    failures.push("Lighthouse must run only for the Chromium matrix job");
  }

  const expectedStepIds = new Map([
    [`build::${SOURCE_IDENTITY}`, "source"],
    ["build::pnpm audit --audit-level=moderate", "dependency-audit"],
    ["build::pnpm verify:source", "source-verification"],
    ["build::pnpm build", "candidate-build"],
    ["build::pnpm release:verify", "release-manifest"],
    ["build::pnpm verify:dist", "built-output"],
    ["build::build-artifact", "build-artifact"],
    ["browser::pnpm release:verify", "artifact-verification"],
    [
      "browser::pnpm exec playwright install --with-deps ${{ matrix.project }}",
      "browser-install",
    ],
    ["browser::pnpm test:e2e --project=${{ matrix.project }}", "browser-tests"],
    ["browser::pnpm performance:lighthouse", "lighthouse"],
  ]);
  for (const [jobName, steps] of Object.entries(jobSteps)) {
    for (const step of steps) {
      if (!isObject(step)) continue;
      const identity =
        step.id === "build-artifact" ? "build-artifact" : step.run;
      const expectedId = expectedStepIds.get(`${jobName}::${identity}`);
      if (expectedId === undefined && Object.hasOwn(step, "id")) {
        failures.push(`${jobName} contains an unexpected step ID: ${step.id}`);
      } else if (expectedId !== undefined && step.id !== expectedId) {
        failures.push(
          `${jobName} step ${String(identity)} must use ID ${expectedId}`,
        );
      }

      let expectedCondition;
      if (
        step.run === SOURCE_EVIDENCE_FINAL ||
        step.run === BROWSER_EVIDENCE_FINAL ||
        (step.uses === ACTIONS.upload && step.id !== "build-artifact")
      ) {
        expectedCondition = "always()";
      } else if (step.run === "pnpm performance:lighthouse") {
        expectedCondition = "matrix.project == 'chromium'";
      }
      if (expectedCondition === undefined && Object.hasOwn(step, "if")) {
        failures.push(`${jobName} contains an unexpected conditional step`);
      } else if (
        expectedCondition !== undefined &&
        (expectedCondition === "always()"
          ? !isAlways(step.if)
          : step.if !== expectedCondition)
      ) {
        failures.push(`${jobName} step has the wrong execution condition`);
      }
    }
  }

  const expectedActionSequences = {
    build: [
      ACTIONS.checkout,
      ACTIONS.pnpm,
      ACTIONS.node,
      ACTIONS.upload,
      ACTIONS.upload,
    ],
    "artifact-contract": [
      ACTIONS.checkout,
      ACTIONS.pnpm,
      ACTIONS.node,
      ACTIONS.download,
    ],
    browser: [
      ACTIONS.checkout,
      ACTIONS.pnpm,
      ACTIONS.node,
      ACTIONS.download,
      ACTIONS.upload,
    ],
  };
  for (const [jobName, expected] of Object.entries(expectedActionSequences)) {
    const actual = jobSteps[jobName]
      .filter((step) => isObject(step) && Object.hasOwn(step, "uses"))
      .map((step) => step.uses);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(
        `${jobName} action sequence differs from its exact contract`,
      );
    }
  }

  const approvedActions = new Set(Object.values(ACTIONS));
  const uploads = [];
  allNodes(workflow, (value, location) => {
    if (!isObject(value)) return;
    if (Object.hasOwn(value, "uses")) {
      if (typeof value.uses !== "string") {
        failures.push(`${location}.uses must be a string`);
      } else {
        validatePinnedAction(failures, value.uses, location);
        if (!approvedActions.has(value.uses)) {
          failures.push(`${location} uses an unapproved action`);
        }
        if (value.uses === ACTIONS.upload) uploads.push(value);
      }
    }
    if (Object.hasOwn(value, "if") && hasDeadCondition(value.if)) {
      failures.push(`${location} has an always-false condition`);
    }
  });

  for (const [index, upload] of uploads.entries()) {
    validateUploadPath(failures, upload, `artifact upload ${index + 1}`);
    if (upload.id !== "build-artifact" && !isAlways(upload.if)) {
      failures.push("every evidence upload must run under if: always()");
    }
  }
  if (uploads.filter((step) => step.id === "build-artifact").length !== 1) {
    failures.push("there must be exactly one candidate artifact upload");
  }

  if (/\$\{\{[\s\S]*?\bsecrets\b[\s\S]*?}}/i.test(source)) {
    failures.push("verification CI must not reference secrets");
  }
  for (const [jobName, steps] of Object.entries(jobSteps)) {
    for (const step of runSteps(steps)) {
      const command = step.run;
      if (
        /\b(?:vercel|netlify|wrangler|firebase)\b[^\n]*(?:deploy|publish|--prod)\b/i.test(
          command,
        ) ||
        /\b(?:npm|pnpm|yarn|bun)\s+publish\b/i.test(command) ||
        /\bgh\s+release\b/i.test(command) ||
        /\bdocker\s+push\b/i.test(command) ||
        /\bgit\s+push\b/i.test(command)
      ) {
        failures.push(`${jobName} must not deploy or publish`);
      }
      if (
        /\b(?:pnpm(?:\s+run)?|npm\s+run|yarn|bun\s+run)\s+build\b/.test(
          command,
        ) &&
        command !== "pnpm build"
      ) {
        failures.push(`${jobName} contains an alternate build command`);
      }
    }
  }

  return [...new Set(failures)];
}

async function main() {
  const workflow = await readFile(WORKFLOW_PATH, "utf8");
  const failures = validateCiContract(workflow);
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("CI artifact and credential-free verification contract passed.");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
