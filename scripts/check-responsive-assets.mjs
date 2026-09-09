import { access } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

const root = process.cwd();
const expected = [
  { width: 640, height: 480 },
  { width: 768, height: 576 },
  { width: 960, height: 720 },
  { width: 1448, height: 1086 },
];
const failures = [];

for (const dimensions of expected) {
  for (const format of ["avif", "webp"]) {
    const path = join(
      root,
      `public/assets/couple-planning-${dimensions.width}.${format}`,
    );
    try {
      await access(path);
      const metadata = await sharp(path).metadata();
      const expectedFormat = format === "avif" ? "heif" : format;
      if (
        metadata.width !== dimensions.width ||
        metadata.height !== dimensions.height ||
        metadata.format !== expectedFormat
      ) {
        failures.push(
          `${dimensions.width}.${format} has invalid dimensions or format`,
        );
      }
      if (metadata.exif || metadata.iptc || metadata.xmp) {
        failures.push(
          `${dimensions.width}.${format} contains embedded metadata`,
        );
      }
    } catch (error) {
      failures.push(
        `${dimensions.width}.${format} could not be inspected: ${error.message}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Responsive asset check passed (${expected.length * 2} files).`);
