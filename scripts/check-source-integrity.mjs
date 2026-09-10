import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const requiredFiles = [
  ".npmrc",
  "index.html",
  "pnpm-lock.yaml",
  "src/App.tsx",
  "src/components/Card.tsx",
  "src/components/PapayaLogo.tsx",
  "src/components/PapayaMark.tsx",
  "src/data/route-metadata.json",
  "src/pages/Home.tsx",
  "src/pages/WhoWeServe.tsx",
  "src/pages/About.tsx",
  "src/pages/Terms.tsx",
  "src/pages/Privacy.tsx",
  "src/pages/NotFound.tsx",
  "vercel.json",
  "public/404.html",
  "public/404.css",
  "public/THIRD_PARTY_NOTICES.txt",
  "public/assets/couple-planning.jpg",
  "public/assets/couple-planning-640.avif",
  "public/assets/couple-planning-640.webp",
  "public/assets/couple-planning-768.avif",
  "public/assets/couple-planning-768.webp",
  "public/assets/couple-planning-960.avif",
  "public/assets/couple-planning-960.webp",
  "public/assets/couple-planning-1448.avif",
  "public/assets/couple-planning-1448.webp",
  "public/assets/papaya-footer-logo-144.webp",
  "public/assets/papaya-footer-logo-288.webp",
  "public/assets/papaya-mark.svg",
  "scripts/generate-responsive-assets.mjs",
  "scripts/generate-route-pages.mjs",
  "scripts/check-route-pages.mjs",
  "scripts/check-git-history.mjs",
  "scripts/check-git-history.test.mjs",
  "scripts/check-ci-contract.mjs",
  "scripts/check-ci-contract.test.mjs",
  "scripts/check-public-repository.test.mjs",
  "scripts/check-responsive-assets.mjs",
  "scripts/check-performance-budget.mjs",
  "scripts/run-lighthouse.mjs",
  "scripts/run-lighthouse.test.mjs",
  "scripts/release-bundle.mjs",
  "scripts/release-bundle.test.mjs",
  "scripts/write-ci-evidence.mjs",
  "scripts/write-ci-evidence.test.mjs",
  "tests/e2e/links.spec.ts",
  "playwright.config.ts",
  "lighthouse-budget.json",
  "SECURITY.md",
  "docs/operations/incident-response.md",
  "docs/operations/release.md",
  "docs/operations/rollback.md",
  "docs/vulnerability-policy.md",
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
];

const retiredAssets = [
  "public/assets/couple-preparing.jpg",
  "public/assets/papaya-health-header.png",
  "public/assets/papaya-health-logo.png",
];

const assetChecksums = new Map([
  [
    "public/assets/papaya-footer-logo-144.webp",
    "8b16e4e6f484f35826fa790fd7f9152ac3ce6869124c0ae8e0dd5649b6227e78",
  ],
  [
    "public/assets/papaya-footer-logo-288.webp",
    "317a1b6bdddcb4d63fa4a775856557cdf0619bcd6b6b6cc3963350211d95e883",
  ],
  [
    "public/assets/couple-planning.jpg",
    "397180249d1a63313009c8781d7597cb3ce2af2c846ca1c153487d46e28d2e39",
  ],
  [
    "public/assets/couple-planning-640.avif",
    "8cdd3e8da8ec0074b21fa6524cccc73c590206e4ba90cd0775440e6cae731a65",
  ],
  [
    "public/assets/couple-planning-640.webp",
    "537e985fceb8e4bd2e16f55203558133a0cf5f9eecf609663cf3b3e302e0f31d",
  ],
  [
    "public/assets/couple-planning-768.avif",
    "74589bb8a9c37075d522a18c45a074b579ce9538f263c0444e224468855b26ef",
  ],
  [
    "public/assets/couple-planning-768.webp",
    "e61a845390278aea9c7f4bda17a59f664e9a6c06fb754f20dd5c8d4ab32455c6",
  ],
  [
    "public/assets/couple-planning-960.avif",
    "d9150890f9ab6416a75065a34630fc4bce57241785251ad6fd1bf1b83b0fff74",
  ],
  [
    "public/assets/couple-planning-960.webp",
    "2d37a9eb76172be0e67f5519fb4d06cdc0cd0dfdc089f6b708d5153e18b56d41",
  ],
  [
    "public/assets/couple-planning-1448.avif",
    "19b9124b911c656b5222eae21532f4828c7b7be178d223a8baa439df4e6c7a4c",
  ],
  [
    "public/assets/couple-planning-1448.webp",
    "c440a5573f5272fbb4d6843f410b91317511b444c229e85b18f7bf04c57579ae",
  ],
  [
    "public/assets/papaya-mark.svg",
    "94929e0c7d52665413fda4b22023a5cbe91ac85fa3d7c99966a0dac7f7a2443b",
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

for (const file of retiredAssets) {
  try {
    await stat(join(root, file));
    failures.push(`${file} must not remain in the production source`);
  } catch {
    // Expected: imported design assets have been replaced.
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

for (const htmlPath of ["index.html", "public/404.html"]) {
  const html = await readFile(join(root, htmlPath), "utf8");
  if (!html.includes("/assets/papaya-mark.svg")) {
    failures.push(`${htmlPath} does not reference the repository-owned mark`);
  }
}

const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const lockfile = await readFile(join(root, "pnpm-lock.yaml"), "utf8");
const hostConfig = JSON.parse(
  await readFile(join(root, "vercel.json"), "utf8"),
);

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

const expectedHostRoutes = new Map([
  ["/about-us", "/about-us.html"],
  ["/privacy", "/privacy.html"],
  ["/terms", "/terms.html"],
  ["/who-we-serve", "/who-we-serve.html"],
]);
const configuredHostRoutes = new Map(
  (hostConfig.rewrites ?? []).map((rewrite) => [
    rewrite.source,
    rewrite.destination,
  ]),
);
for (const [route, output] of expectedHostRoutes) {
  if (configuredHostRoutes.get(route) !== output) {
    failures.push(`vercel.json does not route ${route} to ${output}`);
  }
}
if (configuredHostRoutes.has("/(.*)")) {
  failures.push(
    "vercel.json masks unknown routes instead of returning HTTP 404",
  );
}

const globalHeaders = (hostConfig.headers ?? []).find(
  (entry) => entry.source === "/(.*)",
)?.headers;
const configuredHeaders = new Map(
  (globalHeaders ?? []).map((header) => [
    header.key.toLowerCase(),
    header.value,
  ]),
);
const expectedHeaders = new Map([
  [
    "content-security-policy",
    "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; manifest-src 'self'; media-src 'none'; object-src 'none'; script-src 'self'; style-src 'self'; upgrade-insecure-requests",
  ],
  ["cross-origin-opener-policy", "same-origin"],
  ["cross-origin-resource-policy", "same-origin"],
  [
    "permissions-policy",
    "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  ],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["strict-transport-security", "max-age=31536000; includeSubDomains"],
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
]);
for (const [header, expectedValue] of expectedHeaders) {
  if (configuredHeaders.get(header) !== expectedValue) {
    failures.push(`vercel.json has an invalid ${header} response header`);
  }
}

if (
  hostConfig.framework !== "vite" ||
  hostConfig.outputDirectory !== "dist" ||
  hostConfig.trailingSlash !== false
) {
  failures.push("vercel.json does not match the verified Vite host contract");
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
