import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildBrowserEvidenceRecord,
  buildProvenanceRecord,
  buildSourceEvidenceRecord,
  writeBrowserEvidence,
  writeProvenanceEvidence,
} from "./write-ci-evidence.mjs";

const writerPath = fileURLToPath(
  new URL("./write-ci-evidence.mjs", import.meta.url),
);
const common = {
  repository: "sonny303/papaya",
  sourceRevision: "A".repeat(40),
  sourceTree: "b".repeat(40),
  workflowRunId: "123456789",
  workflowRunAttempt: "2",
};
const artifact = {
  artifactId: "987654321",
  artifactName: "papaya-build-abcdef-2",
  artifactDigest: "C".repeat(64),
};
const provenanceInput = {
  ...common,
  ...artifact,
  publicationMode: "preview",
  siteOrigin: null,
};

function statuses(names, status) {
  return Object.fromEntries(names.map((name) => [name, status]));
}

async function withTemporaryDirectory(callback) {
  const rootDirectory = await mkdtemp(join(tmpdir(), "papaya-evidence-"));
  try {
    await callback(rootDirectory);
  } finally {
    await rm(rootDirectory, { force: true, recursive: true });
  }
}

test("artifact provenance is normalized, bounded, and explicitly undeployed", async () => {
  const record = buildProvenanceRecord(provenanceInput);
  assert.deepEqual(record, {
    schemaVersion: 1,
    kind: "artifact-provenance",
    repository: "sonny303/papaya",
    source: {
      revision: "a".repeat(40),
      tree: "b".repeat(40),
    },
    workflow: { runId: "123456789", attempt: 2 },
    artifact: {
      id: "987654321",
      name: "papaya-build-abcdef-2",
      digest: `sha256:${"c".repeat(64)}`,
    },
    publication: { mode: "preview", siteOrigin: null },
    deployment: null,
    smokeTest: null,
  });

  await withTemporaryDirectory(async (rootDirectory) => {
    const outputPath = await writeProvenanceEvidence(provenanceInput, {
      rootDirectory,
    });
    assert.equal(outputPath, join(rootDirectory, "evidence/provenance.json"));
    const output = await readFile(outputPath, "utf8");
    assert.ok(Buffer.byteLength(output) < 8 * 1024);
    assert.deepEqual(JSON.parse(output), record);
  });
});

test("provenance rejects missing, unexpected, sensitive, and unbounded input", () => {
  assert.throws(
    () => buildProvenanceRecord({ ...provenanceInput, artifactId: undefined }),
    /artifactId/,
  );
  assert.throws(
    () => buildProvenanceRecord({ ...provenanceInput, notes: "private" }),
    /missing or unexpected fields/,
  );
  assert.throws(
    () =>
      buildProvenanceRecord({
        ...provenanceInput,
        artifactName: `ghp_${"x".repeat(24)}`,
      }),
    /sensitive/,
  );
  assert.throws(
    () =>
      buildProvenanceRecord({
        ...provenanceInput,
        artifactName: `a${"b".repeat(128)}`,
      }),
    /unbounded/,
  );
  assert.throws(
    () =>
      buildProvenanceRecord({
        ...provenanceInput,
        sourceRevision: "abc123",
      }),
    /full Git object ID/,
  );
});

test("production provenance accepts only a credential-free HTTPS origin", () => {
  const production = buildProvenanceRecord({
    ...provenanceInput,
    publicationMode: "production",
    siteOrigin: "https://papaya.health",
  });
  assert.deepEqual(production.publication, {
    mode: "production",
    siteOrigin: "https://papaya.health",
  });

  for (const siteOrigin of [
    null,
    "http://papaya.health",
    ["https://user", "secret@papaya.health"].join(":"),
    "https://papaya.health/path",
    "https://papaya.health?token=value",
    "https://localhost",
    "https://papaya.local",
    "https://papaya.example",
    "https://papaya.invalid",
    "https://papaya.test",
    "https://papaya.internal",
    "https://papaya.onion",
    "https://papaya.home.arpa",
    "https://intranet",
    "https://127.0.0.1",
    "https://[::1]",
  ]) {
    assert.throws(() =>
      buildProvenanceRecord({
        ...provenanceInput,
        publicationMode: "production",
        siteOrigin,
      }),
    );
  }

  assert.throws(
    () =>
      buildProvenanceRecord({
        ...provenanceInput,
        siteOrigin: "https://preview.example",
      }),
    /preview evidence must have a null siteOrigin/,
  );
});

test("source evidence is honest while pending and only succeeds when all checks pass", () => {
  const checkNames = [
    "dependencyAudit",
    "sourceVerification",
    "build",
    "releaseManifest",
    "builtOutput",
  ];
  const pending = buildSourceEvidenceRecord({
    ...common,
    checks: statuses(checkNames, "pending"),
  });
  assert.equal(pending.status, "incomplete");
  assert.equal(pending.checks.dependencyAudit, "pending");

  const successful = buildSourceEvidenceRecord({
    ...common,
    checks: statuses(checkNames, "success"),
  });
  assert.equal(successful.status, "success");

  assert.throws(
    () =>
      buildSourceEvidenceRecord({
        ...common,
        checks: { ...statuses(checkNames, "success"), logs: "all output" },
      }),
    /missing or unexpected fields/,
  );
});

test("browser evidence initializes before tests and binds results to one artifact", async () => {
  const checkNames = [
    "artifactVerification",
    "browserInstall",
    "browserTests",
    "lighthouse",
  ];
  const input = {
    ...common,
    ...artifact,
    project: "firefox",
    checks: statuses(checkNames, "pending"),
  };

  await withTemporaryDirectory(async (rootDirectory) => {
    const outputPath = await writeBrowserEvidence(input, { rootDirectory });
    const initialized = JSON.parse(await readFile(outputPath, "utf8"));
    assert.equal(initialized.status, "incomplete");
    assert.equal(initialized.project, "firefox");
    assert.equal(initialized.artifact.id, artifact.artifactId);
    assert.equal(initialized.checks.browserInstall, "pending");
  });

  const successful = buildBrowserEvidenceRecord({
    ...input,
    checks: {
      artifactVerification: "success",
      browserInstall: "success",
      browserTests: "success",
      lighthouse: "skipped",
    },
  });
  assert.equal(successful.status, "success");
});

test("browser evidence rejects path-like projects and false-green status sets", () => {
  const checks = {
    artifactVerification: "success",
    browserInstall: "success",
    browserTests: "success",
    lighthouse: "success",
  };
  assert.throws(
    () =>
      buildBrowserEvidenceRecord({
        ...common,
        ...artifact,
        project: "../chromium",
        checks,
      }),
    /project must be/,
  );
  assert.throws(
    () =>
      buildBrowserEvidenceRecord({
        ...common,
        ...artifact,
        project: "firefox",
        checks,
      }),
    /non-Chromium Lighthouse status/,
  );
  assert.equal(
    buildBrowserEvidenceRecord({
      ...common,
      ...artifact,
      project: "chromium",
      checks: { ...checks, browserTests: "skipped" },
    }).status,
    "incomplete",
  );
});

test("CLI rejects unknown options without echoing their values", () => {
  const result = spawnSync(
    process.execPath,
    [writerPath, "source", "--notes", "do-not-echo-this-value"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unexpected or duplicate option/);
  assert.doesNotMatch(result.stderr, /do-not-echo-this-value/);
});

test("CLI writes the fixed nonhidden browser evidence path", async () => {
  await withTemporaryDirectory(async (rootDirectory) => {
    const argumentsList = [
      writerPath,
      "browser",
      "--repository",
      common.repository,
      "--source-revision",
      common.sourceRevision,
      "--source-tree",
      common.sourceTree,
      "--workflow-run-id",
      common.workflowRunId,
      "--workflow-run-attempt",
      common.workflowRunAttempt,
      "--artifact-id",
      artifact.artifactId,
      "--artifact-name",
      artifact.artifactName,
      "--artifact-digest",
      artifact.artifactDigest,
      "--project",
      "webkit",
    ];
    const result = spawnSync(process.execPath, argumentsList, {
      cwd: rootDirectory,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(
      await readFile(
        join(rootDirectory, "evidence/browser-webkit.json"),
        "utf8",
      ),
    );
    assert.equal(output.status, "incomplete");
    assert.equal(output.checks.browserInstall, "pending");
  });
});
