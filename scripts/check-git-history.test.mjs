import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scannerPath = fileURLToPath(
  new URL("./check-git-history.mjs", import.meta.url),
);
const publicIdentity = [
  "-c",
  "user.name=Papaya Test",
  "-c",
  "user.email=papaya@users.noreply.github.com",
];

function git(rootDirectory, args) {
  const result = spawnSync("git", args, {
    cwd: rootDirectory,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function scan(rootDirectory) {
  return spawnSync(process.execPath, [scannerPath], {
    cwd: rootDirectory,
    encoding: "utf8",
  });
}

async function withRepository(callback) {
  const rootDirectory = await mkdtemp(join(tmpdir(), "papaya-history-scan-"));
  try {
    git(rootDirectory, ["init", "--quiet", "--initial-branch=main"]);
    await writeFile(join(rootDirectory, "README.md"), "# Public fixture\n");
    git(rootDirectory, ["add", "README.md"]);
    git(rootDirectory, [
      ...publicIdentity,
      "commit",
      "--quiet",
      "-m",
      "Initial",
    ]);
    await callback(rootDirectory);
  } finally {
    await rm(rootDirectory, { force: true, recursive: true });
  }
}

test("history scan covers every branch instead of only HEAD", async () => {
  await withRepository(async (rootDirectory) => {
    git(rootDirectory, ["switch", "--quiet", "-c", "published-secondary"]);
    await writeFile(join(rootDirectory, "secondary.txt"), "Public content\n");
    git(rootDirectory, ["add", "secondary.txt"]);
    git(rootDirectory, [
      "-c",
      "user.name=Private Test",
      "-c",
      "user.email=private@example.com",
      "commit",
      "--quiet",
      "-m",
      "Secondary",
    ]);
    git(rootDirectory, ["switch", "--quiet", "main"]);

    const result = scan(rootDirectory);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /non-public author email/);
    assert.match(result.stderr, /non-public committer email/);
  });
});

test("history scan accepts clean identities across every branch and tag", async () => {
  await withRepository(async (rootDirectory) => {
    git(rootDirectory, ["branch", "published-secondary"]);
    git(rootDirectory, [
      ...publicIdentity,
      "tag",
      "--annotate",
      "v0.1.0",
      "--message",
      "Public release",
    ]);

    const result = scan(rootDirectory);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /4 public refs, 1 commits/);
    assert.match(result.stdout, /1 annotated tags/);
  });
});

test("history scan rejects unsafe annotated-tag identity and notes", async () => {
  await withRepository(async (rootDirectory) => {
    const privatePath = ["", "Users", "example", "private"].join("/");
    git(rootDirectory, [
      "-c",
      "user.name=Private Test",
      "-c",
      "user.email=private@example.com",
      "tag",
      "--annotate",
      "unsafe-tag",
      "--message",
      `Local release note: ${privatePath}`,
    ]);

    const result = scan(rootDirectory);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /non-public annotated-tag email/);
    assert.match(
      result.stderr,
      /annotated-tag message contains local macOS path/,
    );
  });
});
