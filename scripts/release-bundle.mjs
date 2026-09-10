import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, posix, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { normalizeSiteOrigin } from "./generate-route-pages.mjs";

const DEFAULT_REPOSITORY = "sonny303/papaya";
const routeMetadata = JSON.parse(
  await readFile(new URL("../src/data/route-metadata.json", import.meta.url)),
);
const manifestKeys = [
  "fileCount",
  "files",
  "publicationMode",
  "repository",
  "schemaVersion",
  "siteOrigin",
  "sourceRevision",
  "sourceTree",
  "status",
  "totalBytes",
  "treeSha256",
].sort();
const fileKeys = ["bytes", "path", "sha256"];
const shaPattern = /^[a-f0-9]{40}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function gitObject(rootDirectory, object) {
  return execFileSync("git", ["rev-parse", object], {
    cwd: rootDirectory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function assertCleanCheckout(rootDirectory) {
  const status = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd: rootDirectory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  ).trim();
  if (status) {
    throw new Error("release manifests require a clean Git checkout");
  }
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} contains unexpected fields`);
  }
}

function assertSafePath(path) {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.includes("\\") ||
    path.startsWith("/") ||
    isAbsolute(path) ||
    posix.normalize(path) !== path ||
    path.split("/").some((segment) => segment === ".." || segment === ".")
  ) {
    throw new Error(`release manifest contains unsafe file path: ${path}`);
  }
}

async function collectFiles(
  outputDirectory,
  directory = outputDirectory,
  manifestPath = join(outputDirectory, "release-manifest.json"),
) {
  const directoryStat = await lstat(directory);
  if (!directoryStat.isDirectory()) {
    throw new Error("release output is not a directory");
  }

  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => compareText(left.name, right.name));

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (absolutePath === manifestPath) continue;
    const fileStat = await lstat(absolutePath);
    if (fileStat.isSymbolicLink()) {
      throw new Error("release output must not contain symbolic links");
    }
    if (fileStat.isDirectory()) {
      files.push(
        ...(await collectFiles(outputDirectory, absolutePath, manifestPath)),
      );
      continue;
    }
    if (!fileStat.isFile()) {
      throw new Error("release output contains an unsupported file type");
    }

    const path = relative(outputDirectory, absolutePath).split(sep).join("/");
    assertSafePath(path);
    const contents = await readFile(absolutePath);
    files.push({ path, bytes: contents.length, sha256: sha256(contents) });
  }

  return files.sort((left, right) => compareText(left.path, right.path));
}

function treeDigest(files) {
  return sha256(
    files.map((file) => `${file.sha256} ${file.bytes} ${file.path}\n`).join(""),
  );
}

function resolvePublication({ publicationMode, siteOrigin }) {
  const mode =
    publicationMode ??
    (process.env.PAPAYA_DEPLOYMENT_ENV === "production"
      ? "production"
      : "preview");
  if (!new Set(["preview", "production"]).has(mode)) {
    throw new Error("release publication mode is invalid");
  }

  const normalizedOrigin = normalizeSiteOrigin(
    siteOrigin ?? process.env.PUBLIC_SITE_ORIGIN,
  );
  if (mode === "production" && !normalizedOrigin) {
    throw new Error("production release manifests require PUBLIC_SITE_ORIGIN");
  }

  return {
    publicationMode: mode,
    siteOrigin: mode === "production" ? normalizedOrigin : null,
  };
}

function resolveSource({ rootDirectory, sourceRevision, sourceTree }) {
  if (!sourceRevision || !sourceTree) assertCleanCheckout(rootDirectory);
  const revision = sourceRevision ?? gitObject(rootDirectory, "HEAD^{commit}");
  const tree = sourceTree ?? gitObject(rootDirectory, "HEAD^{tree}");
  if (!shaPattern.test(revision) || !shaPattern.test(tree)) {
    throw new Error("release source identity must use full Git object IDs");
  }
  return { sourceRevision: revision, sourceTree: tree };
}

function metadataAttribute(html, selector, attributeName) {
  const expression = new RegExp(
    `<${selector}[^>]*${attributeName}="([^"]+)"[^>]*>`,
  );
  return html.match(expression)?.[1] ?? null;
}

async function assertPublicationMatchesOutput(
  outputDirectory,
  { publicationMode, siteOrigin },
) {
  const [robots, sitemap] = await Promise.all([
    readFile(join(outputDirectory, "robots.txt"), "utf8"),
    readFile(join(outputDirectory, "sitemap.xml"), "utf8"),
  ]);

  const indexableRoutes = Object.entries(routeMetadata)
    .filter(([, metadata]) => metadata.indexable)
    .map(([route]) => route);
  const expectedSitemapEntries =
    publicationMode === "production"
      ? indexableRoutes
          .map(
            (route) =>
              `  <url><loc>${new URL(route, siteOrigin).href}</loc></url>`,
          )
          .join("\n")
      : "";
  const expectedSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${expectedSitemapEntries}\n</urlset>\n`;

  if (publicationMode === "preview") {
    if (
      robots !== "User-agent: *\nDisallow: /\n" ||
      sitemap !== expectedSitemap
    ) {
      throw new Error(
        "preview manifest does not match built indexing controls",
      );
    }
  } else if (
    robots !==
      `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n` ||
    sitemap !== expectedSitemap
  ) {
    throw new Error(
      "production manifest does not match built indexing controls",
    );
  }

  for (const [route, metadata] of Object.entries(routeMetadata)) {
    const outputName = route === "/" ? "index.html" : `${route.slice(1)}.html`;
    const html = await readFile(join(outputDirectory, outputName), "utf8");
    const robotsPolicy = metadataAttribute(
      html,
      'meta name="robots"',
      "content",
    );
    const canonical = metadataAttribute(html, 'link rel="canonical"', "href");
    const embeddedOrigin = metadataAttribute(
      html,
      'meta name="papaya-site-origin"',
      "content",
    );
    const robotsTagCount = html.match(/<meta name="robots" /g)?.length ?? 0;
    const canonicalTagCount =
      html.match(/<link rel="canonical" /g)?.length ?? 0;
    const originTagCount =
      html.match(/<meta name="papaya-site-origin" /g)?.length ?? 0;

    if (publicationMode === "preview") {
      if (
        robotsPolicy !== "noindex,follow" ||
        canonical !== null ||
        embeddedOrigin !== null ||
        robotsTagCount !== 1 ||
        canonicalTagCount !== 0 ||
        originTagCount !== 0
      ) {
        throw new Error("preview manifest does not match built route metadata");
      }
      continue;
    }

    const expectedCanonical = new URL(route, siteOrigin).href;
    const expectedRobots = metadata.indexable
      ? "index,follow"
      : "noindex,follow";
    if (
      robotsPolicy !== expectedRobots ||
      canonical !== expectedCanonical ||
      embeddedOrigin !== siteOrigin ||
      robotsTagCount !== 1 ||
      canonicalTagCount !== 1 ||
      originTagCount !== 1
    ) {
      throw new Error(
        "production manifest does not match built route metadata",
      );
    }
  }
}

export async function createReleaseManifest({
  rootDirectory = process.cwd(),
  outputDirectory = join(rootDirectory, "dist"),
  manifestPath = join(outputDirectory, "release-manifest.json"),
  repository = DEFAULT_REPOSITORY,
  sourceRevision,
  sourceTree,
  publicationMode,
  siteOrigin,
} = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("release repository identity is invalid");
  }

  if (manifestPath !== join(outputDirectory, "release-manifest.json")) {
    throw new Error(
      "release manifest must be stored at dist/release-manifest.json",
    );
  }
  const files = await collectFiles(
    outputDirectory,
    outputDirectory,
    manifestPath,
  );
  if (files.length === 0) throw new Error("release output is empty");
  const source = resolveSource({ rootDirectory, sourceRevision, sourceTree });
  const publication = resolvePublication({ publicationMode, siteOrigin });
  await assertPublicationMatchesOutput(outputDirectory, publication);
  const manifest = {
    schemaVersion: 1,
    status: "candidate",
    repository,
    ...source,
    ...publication,
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    treeSha256: treeDigest(files),
    files,
  };

  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function verifyReleaseManifest({
  rootDirectory = process.cwd(),
  outputDirectory = join(rootDirectory, "dist"),
  manifestPath = join(outputDirectory, "release-manifest.json"),
  repository = DEFAULT_REPOSITORY,
  sourceRevision,
  sourceTree,
} = {}) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assertExactKeys(manifest, manifestKeys, "release manifest");
  if (
    manifest.schemaVersion !== 1 ||
    manifest.status !== "candidate" ||
    manifest.repository !== repository
  ) {
    throw new Error("release manifest identity is invalid");
  }

  const source = resolveSource({ rootDirectory, sourceRevision, sourceTree });
  if (
    manifest.sourceRevision !== source.sourceRevision ||
    manifest.sourceTree !== source.sourceTree
  ) {
    throw new Error("release manifest does not match the checked-out source");
  }

  if (manifest.publicationMode === "preview") {
    if (manifest.siteOrigin !== null) {
      throw new Error("preview release manifest must not publish an origin");
    }
  } else if (
    manifest.publicationMode !== "production" ||
    !manifest.siteOrigin ||
    normalizeSiteOrigin(manifest.siteOrigin) !== manifest.siteOrigin
  ) {
    throw new Error("release manifest publication identity is invalid");
  }

  if (!Array.isArray(manifest.files)) {
    throw new Error("release manifest file inventory is invalid");
  }
  for (const file of manifest.files) {
    assertExactKeys(file, fileKeys, "release manifest file");
    assertSafePath(file.path);
    if (
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 0 ||
      !sha256Pattern.test(file.sha256)
    ) {
      throw new Error("release manifest file metadata is invalid");
    }
  }

  if (manifestPath !== join(outputDirectory, "release-manifest.json")) {
    throw new Error(
      "release manifest must be stored at dist/release-manifest.json",
    );
  }
  await assertPublicationMatchesOutput(outputDirectory, manifest);
  const actualFiles = await collectFiles(
    outputDirectory,
    outputDirectory,
    manifestPath,
  );
  if (JSON.stringify(actualFiles) !== JSON.stringify(manifest.files)) {
    throw new Error("release output differs from the manifest inventory");
  }
  const totalBytes = actualFiles.reduce((total, file) => total + file.bytes, 0);
  if (
    manifest.fileCount !== actualFiles.length ||
    manifest.totalBytes !== totalBytes ||
    manifest.treeSha256 !== treeDigest(actualFiles)
  ) {
    throw new Error("release manifest totals are invalid");
  }

  return manifest;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === "create") {
    const manifest = await createReleaseManifest();
    console.log(
      `Created candidate manifest for ${manifest.fileCount} files (${manifest.treeSha256}).`,
    );
  } else if (command === "verify") {
    const manifest = await verifyReleaseManifest();
    console.log(
      `Verified candidate manifest for ${manifest.fileCount} files (${manifest.treeSha256}).`,
    );
  } else {
    throw new Error("usage: node scripts/release-bundle.mjs <create|verify>");
  }
}
