import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createReleaseManifest,
  verifyReleaseManifest,
} from "./release-bundle.mjs";

const sourceRevision = "a".repeat(40);
const sourceTree = "b".repeat(40);
const routeMetadata = JSON.parse(
  await readFile(new URL("../src/data/route-metadata.json", import.meta.url)),
);

async function writePublicationFiles(
  outputDirectory,
  { publicationMode = "preview", siteOrigin = null } = {},
) {
  const production = publicationMode === "production";
  const indexableUrls = [];

  for (const [route, metadata] of Object.entries(routeMetadata)) {
    const outputName = route === "/" ? "index.html" : `${route.slice(1)}.html`;
    const canonical = production ? new URL(route, siteOrigin).href : null;
    const tags = [
      `<meta name="robots" content="${
        production && metadata.indexable ? "index,follow" : "noindex,follow"
      }" />`,
    ];
    if (canonical) {
      tags.push(
        `<meta name="papaya-site-origin" content="${siteOrigin}" />`,
        `<link rel="canonical" href="${canonical}" />`,
      );
      if (metadata.indexable) indexableUrls.push(canonical);
    }
    await writeFile(
      join(outputDirectory, outputName),
      `<!doctype html><html><head>${tags.join("")}</head><body></body></html>\n`,
    );
  }

  await writeFile(
    join(outputDirectory, "robots.txt"),
    production
      ? `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n",
  );
  const sitemapEntries = indexableUrls
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join("\n");
  await writeFile(
    join(outputDirectory, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
  );
}

async function fixture() {
  const rootDirectory = await mkdtemp(join(tmpdir(), "papaya-release-"));
  const outputDirectory = join(rootDirectory, "dist");
  const manifestPath = join(outputDirectory, "release-manifest.json");
  await mkdir(join(outputDirectory, "assets"), { recursive: true });
  await writePublicationFiles(outputDirectory);
  await writeFile(join(outputDirectory, "assets/site.css"), "body{}\n");
  const options = {
    rootDirectory,
    outputDirectory,
    manifestPath,
    repository: "example/papaya",
    sourceRevision,
    sourceTree,
    publicationMode: "preview",
  };
  return { rootDirectory, outputDirectory, manifestPath, options };
}

async function withFixture(callback) {
  const value = await fixture();
  try {
    await callback(value);
  } finally {
    await rm(value.rootDirectory, { force: true, recursive: true });
  }
}

test("release manifest is deterministic and verifies clean output", async () => {
  await withFixture(async ({ manifestPath, options }) => {
    await createReleaseManifest(options);
    const first = await readFile(manifestPath);
    await createReleaseManifest(options);
    const second = await readFile(manifestPath);
    assert.deepEqual(second, first);
    await verifyReleaseManifest(options);
  });
});

test("release verification rejects changed, missing, and extra files", async () => {
  for (const mutate of [
    ({ outputDirectory }) =>
      writeFile(join(outputDirectory, "assets/site.css"), "body{color:red}\n"),
    ({ outputDirectory }) =>
      rm(join(outputDirectory, "assets/site.css"), { force: true }),
    ({ outputDirectory }) =>
      writeFile(join(outputDirectory, "extra.txt"), "unexpected\n"),
  ]) {
    await withFixture(async (value) => {
      await createReleaseManifest(value.options);
      await mutate(value);
      await assert.rejects(
        verifyReleaseManifest(value.options),
        /differs from the manifest inventory/,
      );
    });
  }
});

test("release verification rejects source and path substitution", async () => {
  await withFixture(async ({ manifestPath, options }) => {
    await createReleaseManifest(options);
    await assert.rejects(
      verifyReleaseManifest({ ...options, sourceRevision: "c".repeat(40) }),
      /does not match the checked-out source/,
    );

    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.files[0].path = "../outside.txt";
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await assert.rejects(verifyReleaseManifest(options), /unsafe file path/);
  });
});

test("release creation rejects symbolic links", async () => {
  await withFixture(async ({ outputDirectory, options }) => {
    await symlink("index.html", join(outputDirectory, "linked.html"));
    await assert.rejects(
      createReleaseManifest(options),
      /must not contain symbolic links/,
    );
  });
});

test("release mode must match the built indexing controls", async () => {
  await withFixture(async ({ manifestPath, options }) => {
    await assert.rejects(
      createReleaseManifest({
        ...options,
        publicationMode: "production",
        siteOrigin: "https://papaya.example.com",
      }),
      /production manifest does not match built indexing controls/,
    );

    await createReleaseManifest(options);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.publicationMode = "production";
    manifest.siteOrigin = "https://papaya.example.com";
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await assert.rejects(
      verifyReleaseManifest(options),
      /production manifest does not match built indexing controls/,
    );
  });
});

test("production release manifest verifies production route bytes", async () => {
  await withFixture(async ({ outputDirectory, options }) => {
    const siteOrigin = "https://papaya.example.com";
    await writePublicationFiles(outputDirectory, {
      publicationMode: "production",
      siteOrigin,
    });
    const productionOptions = {
      ...options,
      publicationMode: "production",
      siteOrigin,
    };
    await createReleaseManifest(productionOptions);
    await verifyReleaseManifest(productionOptions);
  });
});

async function dirtyGitFixture(mutate) {
  const rootDirectory = await mkdtemp(join(tmpdir(), "papaya-release-git-"));
  try {
    const outputDirectory = join(rootDirectory, "dist");
    await mkdir(outputDirectory);
    await writePublicationFiles(outputDirectory);
    await writeFile(join(rootDirectory, ".gitignore"), "dist/\n");
    await writeFile(join(rootDirectory, "source.txt"), "clean\n");
    execFileSync("git", ["init", "--quiet"], { cwd: rootDirectory });
    execFileSync("git", ["add", "."], { cwd: rootDirectory });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Papaya Test",
        "-c",
        "user.email=papaya@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "test fixture",
      ],
      { cwd: rootDirectory },
    );
    await mutate(rootDirectory);

    await assert.rejects(
      createReleaseManifest({ rootDirectory, outputDirectory }),
      /require a clean Git checkout/,
    );
  } finally {
    await rm(rootDirectory, { force: true, recursive: true });
  }
}

test("release creation rejects tracked and untracked source changes", async () => {
  await dirtyGitFixture((rootDirectory) =>
    writeFile(join(rootDirectory, "source.txt"), "changed\n"),
  );
  await dirtyGitFixture((rootDirectory) =>
    writeFile(join(rootDirectory, "untracked.txt"), "new\n"),
  );
});
