import { gzipSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const outputDirectory = join(root, "dist");

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

async function gzipSize(path) {
  return gzipSync(await readFile(path), { level: 9 }).length;
}

function kibibytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

const files = await walk(outputDirectory);
const fileRecords = await Promise.all(
  files.map(async (path) => ({
    path,
    name: relative(outputDirectory, path),
    bytes: (await stat(path)).size,
  })),
);
const javascript = fileRecords.filter(({ path }) => extname(path) === ".js");
const styles = fileRecords.filter(({ path }) => extname(path) === ".css");
const fonts = fileRecords.filter(({ path }) => /\.(?:woff2?)$/.test(path));
const responsiveImages = fileRecords.filter(({ name }) =>
  /^assets\/couple-planning-\d+\.(?:avif|webp)$/.test(name),
);
const originalImage = fileRecords.find(
  ({ name }) => name === "assets/couple-planning.jpg",
);

const totals = {
  javascript: javascript.reduce((sum, file) => sum + file.bytes, 0),
  javascriptGzip: (
    await Promise.all(javascript.map(({ path }) => gzipSize(path)))
  ).reduce((sum, bytes) => sum + bytes, 0),
  styles: styles.reduce((sum, file) => sum + file.bytes, 0),
  stylesGzip: (
    await Promise.all(styles.map(({ path }) => gzipSize(path)))
  ).reduce((sum, bytes) => sum + bytes, 0),
  fonts: fonts.reduce((sum, file) => sum + file.bytes, 0),
  output: fileRecords.reduce((sum, file) => sum + file.bytes, 0),
  responsiveImage: Math.max(...responsiveImages.map(({ bytes }) => bytes), 0),
  originalImage: originalImage?.bytes ?? 0,
};
const budgets = {
  javascript: 280 * 1024,
  javascriptGzip: 85 * 1024,
  styles: 24 * 1024,
  stylesGzip: 6 * 1024,
  fonts: 110 * 1024,
  output: 1200 * 1024,
  responsiveImage: 100 * 1024,
  originalImage: 400 * 1024,
};
const labels = {
  javascript: "JavaScript raw",
  javascriptGzip: "JavaScript gzip",
  styles: "CSS raw",
  stylesGzip: "CSS gzip",
  fonts: "fonts",
  output: "total build",
  responsiveImage: "largest responsive image",
  originalImage: "original image fallback",
};
const failures = [];

if (javascript.length === 0)
  failures.push("dist contains no JavaScript bundle");
if (styles.length === 0) failures.push("dist contains no CSS bundle");
if (responsiveImages.length !== 8) {
  failures.push("dist does not contain all eight responsive image variants");
}
if (!originalImage) failures.push("dist lacks the original image fallback");

for (const [key, budget] of Object.entries(budgets)) {
  if (totals[key] > budget) {
    failures.push(
      `${labels[key]} is ${kibibytes(totals[key])}; budget is ${kibibytes(budget)}`,
    );
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  Object.keys(budgets)
    .map(
      (key) =>
        `${labels[key]} ${kibibytes(totals[key])}/${kibibytes(budgets[key])}`,
    )
    .join("\n"),
);
