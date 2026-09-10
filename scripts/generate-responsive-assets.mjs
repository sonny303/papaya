import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import sharp from "sharp";

const root = process.cwd();
const names = ["couple-planning", "planning-board"];
const widths = [640, 768, 960, 1448];

for (const name of names) {
  const source = join(root, `public/assets/${name}.jpg`);
  for (const width of widths) {
    for (const format of ["avif", "webp"]) {
      const output = join(root, `public/assets/${name}-${width}.${format}`);
      await mkdir(dirname(output), { recursive: true });

      const pipeline = sharp(source).resize({
        width,
        fit: "inside",
        withoutEnlargement: true,
      });

      if (format === "avif") {
        await pipeline.avif({ effort: 6, quality: 55 }).toFile(output);
      } else {
        await pipeline
          .webp({ effort: 6, quality: name === "planning-board" ? 74 : 78 })
          .toFile(output);
      }
    }
  }
}
console.log(
  `Generated ${names.length * widths.length * 2} responsive image variants from the two source photographs.`,
);
