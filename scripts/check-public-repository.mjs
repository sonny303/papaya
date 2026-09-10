import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const forbiddenFilePatterns = [
  { label: "environment file", pattern: /(^|\/)\.env(?:\.|$)/i },
  {
    label: "private working file",
    pattern: /(^|\/)(?:internal|private|scratch|notes?)(?:[._/-]|$)/i,
  },
  { label: "credential file", pattern: /\.(?:key|p12|pfx|pem)$/i },
];
const forbiddenContentPatterns = [
  { label: "local macOS path", pattern: /\/Users\// },
  { label: "local Windows path", pattern: /[A-Z]:\\Users\\/i },
  { label: "private key", pattern: /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/ },
  { label: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { label: "npm token", pattern: /npm_[A-Za-z0-9]{20,}/ },
  { label: "Slack token", pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { label: "Google API key", pattern: /AIza[A-Za-z0-9_-]{30,}/ },
  { label: "payment secret", pattern: /sk_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { label: "OpenAI secret", pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  {
    label: "Supabase service-role assignment",
    pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?\S{20,}/i,
  },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else paths.push(path);
  }

  return paths;
}

const failures = [];
let checkedFiles = 0;

for (const file of await walk(root)) {
  const displayPath = relative(root, file).split(sep).join("/");

  for (const check of forbiddenFilePatterns) {
    if (check.pattern.test(displayPath)) {
      failures.push(`${displayPath} is a forbidden ${check.label}`);
    }
  }

  checkedFiles += 1;
  const contents = (await readFile(file)).toString("utf8");
  for (const check of forbiddenContentPatterns) {
    if (check.pattern.test(contents)) {
      failures.push(`${displayPath} contains ${check.label}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Public repository scan passed (${checkedFiles} files checked).`);
