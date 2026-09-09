import { execFileSync } from "node:child_process";

const maxBlobBytes = 5 * 1024 * 1024;
const allowedEmailPattern =
  /^(?:[^@\s]+@users\.noreply\.github\.com|noreply@github\.com)$/;
const forbiddenPathPatterns = [
  { label: "environment file", pattern: /(^|\/)\.env(?:\.|$)/i },
  { label: "host link state", pattern: /(^|\/)\.vercel(?:\/|$)/i },
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
  {
    label: "GitHub fine-grained token",
    pattern: /github_pat_[A-Za-z0-9_]{20,}/,
  },
  { label: "npm token", pattern: /npm_[A-Za-z0-9]{20,}/ },
  {
    label: "npm auth assignment",
    pattern: /\/\/[^:\s]+(?::\d+)?\/?:_authToken\s*=\s*(?!\$\{)[^\s"']{8,}/i,
  },
  { label: "Slack token", pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { label: "Google API key", pattern: /AIza[A-Za-z0-9_-]{30,}/ },
  { label: "AWS access key", pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/ },
  { label: "payment secret", pattern: /sk_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { label: "OpenAI secret", pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  {
    label: "credential-bearing URL",
    pattern: /https?:\/\/[^\s/:@]+:[^\s/@]+@/i,
  },
  {
    label: "Vercel token assignment",
    pattern: /VERCEL_TOKEN\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/i,
  },
  {
    label: "Supabase service-role assignment",
    pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?\S{20,}/i,
  },
];

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: options.encoding === undefined ? "utf8" : options.encoding,
    maxBuffer: 20 * 1024 * 1024,
  });
}

function findForbiddenContent(contents) {
  return forbiddenContentPatterns
    .filter(({ pattern }) => pattern.test(contents))
    .map(({ label }) => label);
}

const failures = [];
const records = git(["log", "--format=%H%x1f%ae%x1f%ce%x1f%B%x1e", "HEAD"])
  .split("\x1e")
  .map((record) => record.trim())
  .filter(Boolean);

for (const record of records) {
  const [commit, authorEmail, committerEmail, ...messageParts] =
    record.split("\x1f");
  for (const [role, email] of [
    ["author", authorEmail],
    ["committer", committerEmail],
  ]) {
    if (!allowedEmailPattern.test(email)) {
      failures.push(`${commit} has a non-public ${role} email`);
    }
  }

  for (const label of findForbiddenContent(messageParts.join("\x1f"))) {
    failures.push(`${commit} message contains ${label}`);
  }
}

const objects = git(["rev-list", "--objects", "HEAD"])
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
const checkedBlobs = new Set();

for (const object of objects) {
  const separator = object.indexOf(" ");
  if (separator === -1) continue;

  const objectId = object.slice(0, separator);
  const path = object.slice(separator + 1);
  for (const { label, pattern } of forbiddenPathPatterns) {
    if (pattern.test(path)) failures.push(`${path} is a forbidden ${label}`);
  }

  if (checkedBlobs.has(objectId)) continue;
  if (git(["cat-file", "-t", objectId]).trim() !== "blob") continue;
  checkedBlobs.add(objectId);

  const size = Number(git(["cat-file", "-s", objectId]).trim());
  if (size > maxBlobBytes) {
    failures.push(`${path} is a ${size}-byte historical blob`);
    continue;
  }

  const contents = git(["cat-file", "blob", objectId], { encoding: null });
  for (const label of findForbiddenContent(contents.toString("utf8"))) {
    failures.push(`${path} historical content contains ${label}`);
  }
}

if (failures.length > 0) {
  console.error([...new Set(failures)].join("\n"));
  process.exit(1);
}

console.log(
  `Git history scan passed (${records.length} commits and ${checkedBlobs.size} unique blobs checked).`,
);
