import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const outputDirectory = join(root, "dist");
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".svg",
  ".txt",
  ".xml",
]);
const forbiddenPatterns = [
  { label: "local macOS path", pattern: /\/Users\// },
  { label: "local Windows path", pattern: /[A-Z]:\\Users\\/i },
  {
    label: "local development URL",
    // React Router embeds a bare `http://localhost` URL-construction fallback.
    // Project-authored local URLs are rejected by the source scan; keep rejecting
    // bundled loopback hosts that include an addressable path or port.
    pattern: /https?:\/\/(?:127\.0\.0\.1|localhost(?=[:/]))/i,
  },
  { label: "editor runtime URL", pattern: /cdn\.magicpatterns\.com/i },
  { label: "preview title", pattern: /Internal Preview/i },
  { label: "private key", pattern: /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/ },
  { label: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { label: "payment secret", pattern: /sk_(?:live|test)_[A-Za-z0-9]{16,}/ },
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

const files = await walk(outputDirectory);
const failures = files
  .filter((file) => file.endsWith(".map"))
  .map((file) => `${relative(root, file)} is a source map`);

if (!files.includes(join(outputDirectory, "THIRD_PARTY_NOTICES.txt"))) {
  failures.push("dist/THIRD_PARTY_NOTICES.txt is missing");
} else {
  const [sourceNotice, outputNotice] = await Promise.all([
    readFile(join(root, "public/THIRD_PARTY_NOTICES.txt")),
    readFile(join(outputDirectory, "THIRD_PARTY_NOTICES.txt")),
  ]);
  if (!sourceNotice.equals(outputNotice)) {
    failures.push("dist/THIRD_PARTY_NOTICES.txt differs from its source");
  }
}

for (const requiredOutput of ["404.html", "404.css"]) {
  if (!files.includes(join(outputDirectory, requiredOutput))) {
    failures.push(`dist/${requiredOutput} is missing`);
  }
}

for (const file of files) {
  if (!textExtensions.has(extname(file))) continue;
  const contents = await readFile(file, "utf8");

  for (const check of forbiddenPatterns) {
    if (check.pattern.test(contents))
      failures.push(`${relative(root, file)} contains ${check.label}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Public build scan passed (${files.length} output files checked).`);
