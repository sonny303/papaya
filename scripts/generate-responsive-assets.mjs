import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import sharp from "sharp";

const root = process.cwd();
const source = join(root, "public/assets/couple-planning.jpg");
const widths = [640, 768, 960, 1448];

for (const width of widths) {
  for (const format of ["avif", "webp"]) {
    const output = join(
      root,
      `public/assets/couple-planning-${width}.${format}`,
    );
    await mkdir(dirname(output), { recursive: true });

    const pipeline = sharp(source).resize({
      width,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (format === "avif") {
      await pipeline.avif({ effort: 6, quality: 55 }).toFile(output);
    } else {
      await pipeline.webp({ effort: 6, quality: 78 }).toFile(output);
    }
  }
}

console.log(
  `Generated ${widths.length * 2} responsive image variants from couple-planning.jpg.`,
);
