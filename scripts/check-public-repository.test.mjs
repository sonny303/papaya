import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scannerPath = fileURLToPath(
  new URL("./check-public-repository.mjs", import.meta.url),
);

async function withRepository(callback) {
  const rootDirectory = await mkdtemp(join(tmpdir(), "papaya-public-scan-"));
  try {
    const initialized = spawnSync("git", ["init", "--quiet"], {
      cwd: rootDirectory,
      encoding: "utf8",
    });
    assert.equal(initialized.status, 0, initialized.stderr);
    await callback(rootDirectory);
  } finally {
    await rm(rootDirectory, { force: true, recursive: true });
  }
}

async function put(rootDirectory, path, contents) {
  const absolutePath = join(rootDirectory, path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);
}

function scan(rootDirectory) {
  return spawnSync(process.execPath, [scannerPath], {
    cwd: rootDirectory,
    encoding: "utf8",
  });
}

test("root generated output is skipped", async () => {
  await withRepository(async (rootDirectory) => {
    await put(rootDirectory, "README.md", "# Public fixture\n");
    await put(
      rootDirectory,
      "dist/generated.txt",
      `Synthetic local path: ${["", "Users", "example", "private"].join("/")}\n`,
    );

    const result = scan(rootDirectory);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Public repository scan passed/);
  });
});

test("nested generated directories do not hide unsafe content", async () => {
  await withRepository(async (rootDirectory) => {
    await put(rootDirectory, "README.md", "# Public fixture\n");
    await put(
      rootDirectory,
      "docs/dist/leak.txt",
      `Synthetic local path: ${["", "Users", "example", "private"].join("/")}\n`,
    );

    const result = scan(rootDirectory);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /docs\/dist\/leak\.txt contains local macOS path/,
    );
  });
});

test("tracked generated directory names are rejected at any depth", async () => {
  await withRepository(async (rootDirectory) => {
    await put(rootDirectory, "README.md", "# Public fixture\n");
    await put(rootDirectory, "docs/evidence/result.json", "{}\n");
    const staged = spawnSync(
      "git",
      ["add", "README.md", "docs/evidence/result.json"],
      { cwd: rootDirectory, encoding: "utf8" },
    );
    assert.equal(staged.status, 0, staged.stderr);

    const result = scan(rootDirectory);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /docs\/evidence\/result\.json is tracked generated evidence or build output/,
    );
  });
});
