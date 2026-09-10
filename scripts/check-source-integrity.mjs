import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "pnpm-lock.yaml",
  "src/App.tsx",
  "src/components/Card.tsx",
  "src/components/PapayaLogo.tsx",
  "src/pages/Home.tsx",
  "src/pages/WhoWeServe.tsx",
  "src/pages/About.tsx",
  "src/pages/Terms.tsx",
  "src/pages/Privacy.tsx",
  "src/pages/NotFound.tsx",
  "host-contract.json",
  "wrangler.json",
  "workers/site.ts",
  "public/404.html",
  "public/404.css",
  "public/THIRD_PARTY_NOTICES.txt",
  "public/assets/couple-preparing.jpg",
  "public/assets/papaya-health-header.png",
  "public/assets/papaya-health-logo.png",
];

const assetChecksums = new Map([
  [
    "public/assets/couple-preparing.jpg",
    "41e419e089de6abf1b0c778224dd21cfca66285beb1fbd13b43d646943e1a91e",
  ],
  [
    "public/assets/papaya-health-header.png",
    "a9ec55674217dab6003f7b9bffae46a49a6b33dc2c450dc399417e20213f43a2",
  ],
  [
    "public/assets/papaya-health-logo.png",
    "6842e78efa384edc86a283d99dc890edd8a050ebec1ce50ca59914e7da5e4a15",
  ],
]);

const thirdPartyNoticeChecksum =
  "02d97a6d72d2af704a4ca125c80af800191b88bd44b01d917b1cea4f97b04129";
const noticedProductionPackages = new Map([
  ["@fontsource/dm-sans", "5.3.0"],
  ["cookie", "1.1.1"],
  ["lucide-react", "0.577.0"],
  ["react", "19.2.8"],
  ["react-dom", "19.2.8"],
  ["react-router", "7.18.3"],
  ["react-router-dom", "7.18.3"],
  ["scheduler", "0.27.0"],
  ["set-cookie-parser", "2.7.2"],
]);

const sourceExtensions = new Set([".css", ".js", ".mjs", ".ts", ".tsx"]);
const forbiddenRuntimePatterns = [
  { label: "Magic Patterns CDN", pattern: /cdn\.magicpatterns\.com/i },
  { label: "Google Fonts runtime", pattern: /fonts\.googleapis\.com/i },
  { label: "preview title", pattern: /Internal Preview/i },
  {
    label: "local development URL",
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1)/i,
  },
  { label: "local macOS path", pattern: /\/Users\// },
  { label: "local Windows path", pattern: /[A-Z]:\\Users\\/i },
  { label: "inline React style", pattern: /\bstyle\s*=\s*\{\{/ },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else paths.push(path);
  }

  return paths;
}

const failures = [];

for (const file of requiredFiles) {
  try {
    const fileStat = await stat(join(root, file));
    if (!fileStat.isFile() || fileStat.size === 0)
      failures.push(`${file} is empty or not a file`);
  } catch {
    failures.push(`${file} is missing`);
  }
}

for (const [file, expectedChecksum] of assetChecksums) {
  try {
    const contents = await readFile(join(root, file));
    const actualChecksum = createHash("sha256").update(contents).digest("hex");
    if (actualChecksum !== expectedChecksum) {
      failures.push(`${file} does not match its approved checksum`);
    }
  } catch {
    // Missing files are already reported by the required-file check.
  }
}

const noticePath = join(root, "public/THIRD_PARTY_NOTICES.txt");
const noticeContents = await readFile(noticePath, "utf8");
const noticeChecksum = createHash("sha256")
  .update(noticeContents)
  .digest("hex");
if (noticeChecksum !== thirdPartyNoticeChecksum) {
  failures.push(
    "public/THIRD_PARTY_NOTICES.txt changed without an approved notice update",
  );
}

const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const lockfile = await readFile(join(root, "pnpm-lock.yaml"), "utf8");
const hostContract = JSON.parse(
  await readFile(join(root, "host-contract.json"), "utf8"),
);
const wranglerConfig = JSON.parse(
  await readFile(join(root, "wrangler.json"), "utf8"),
);
const workerSource = await readFile(join(root, "workers/site.ts"), "utf8");

for (const [name, version] of noticedProductionPackages) {
  if (!noticeContents.includes(`- ${name} ${version}`)) {
    failures.push(`third-party notices omit ${name} ${version}`);
  }
  if (!lockfile.includes(`${name}@${version}`)) {
    failures.push(`third-party notices reference unlocked ${name} ${version}`);
  }
}

for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
  if (noticedProductionPackages.get(name) !== version) {
    failures.push(`production dependency ${name} ${version} lacks a notice`);
  }
}

const expectedHostRoutes = new Set([
  "/about-us",
  "/privacy",
  "/terms",
  "/who-we-serve",
]);
const configuredHostRoutes = new Set(hostContract.spaRoutes ?? []);
for (const route of expectedHostRoutes) {
  if (!configuredHostRoutes.has(route)) {
    failures.push(
      `host-contract.json does not route ${route} to the application`,
    );
  }
}
if (configuredHostRoutes.has("/(.*)") || configuredHostRoutes.has("/*")) {
  failures.push(
    "host-contract.json masks unknown routes instead of returning HTTP 404",
  );
}

const configuredHeaderNames = new Set(
  Object.keys(hostContract.headers ?? {}).map((header) => header.toLowerCase()),
);
for (const header of [
  "content-security-policy",
  "permissions-policy",
  "referrer-policy",
  "strict-transport-security",
  "x-content-type-options",
]) {
  if (!configuredHeaderNames.has(header)) {
    failures.push(
      `host-contract.json is missing the ${header} response header`,
    );
  }
}

if (
  hostContract.outputDirectory !== "dist" ||
  hostContract.trailingSlash !== false ||
  wranglerConfig.assets?.directory !== "./dist" ||
  wranglerConfig.assets?.html_handling !== "drop-trailing-slash" ||
  wranglerConfig.assets?.not_found_handling !== "404-page" ||
  wranglerConfig.assets?.run_worker_first !== true ||
  wranglerConfig.main !== "workers/site.ts" ||
  !workerSource.includes('from "../host-contract.json"') ||
  !workerSource.includes("env.ASSETS.fetch")
) {
  failures.push(
    "Cloudflare host config does not match the verified Vite host contract",
  );
}

if (/vercel/i.test(workerSource) || manifest.dependencies?.vercel) {
  failures.push(
    "repository still references Vercel in the production host path",
  );
}

for (const file of await walk(join(root, "src"))) {
  if (!sourceExtensions.has(extname(file))) continue;
  const contents = await readFile(file, "utf8");
  const displayPath = relative(root, file);

  if (contents.trim().length === 0) failures.push(`${displayPath} is empty`);
  for (const check of forbiddenRuntimePatterns) {
    if (check.pattern.test(contents))
      failures.push(
        `${displayPath} contains forbidden runtime reference: ${check.label}`,
      );
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Source integrity passed (${requiredFiles.length} required files checked).`,
);
