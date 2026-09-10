# Design source record

The initial website implementation was adapted from the approved Papaya Health v14 design export.

| Field          | Value      |
| -------------- | ---------- |
| Design version | v14        |
| Imported       | 2026-09-09 |

The design was treated as a visual and content specification. Editor-only component stubs and runtime asset URLs were replaced with repository-owned implementations and files. Accessibility and responsive defects found during the import were corrected in production source.

## Repository-owned production assets

| File                          | Origin                                                                 | SHA-256                                                            |
| ----------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `couple-planning.jpg`         | Generated specifically for this project, then web-optimized            | `397180249d1a63313009c8781d7597cb3ce2af2c846ca1c153487d46e28d2e39` |
| `papaya-footer-logo-144.webp` | Transparent web derivative of source artwork supplied for this project | `8b16e4e6f484f35826fa790fd7f9152ac3ce6869124c0ae8e0dd5649b6227e78` |
| `papaya-footer-logo-288.webp` | High-density transparent derivative of the same supplied artwork       | `317a1b6bdddcb4d63fa4a775856557cdf0619bcd6b6b6cc3963350211d95e883` |
| `papaya-mark.svg`             | Original vector authored directly in this repository                   | `94929e0c7d52665413fda4b22023a5cbe91ac85fa3d7c99966a0dac7f7a2443b` |

The lifestyle image was created on 2026-09-09 using OpenAI image generation
from a project-specific text prompt with no reference image. It depicts two
adult partners planning together in a neutral home setting and was constrained
to exclude brands, logos, readable text, and medical records. The checked-in
JPEG is a 1448 by 1086 production derivative and contains no authentication
credentials or account identifiers.

The eight `couple-planning-{640,768,960,1448}.{avif,webp}` files are deterministic
responsive derivatives generated from that approved JPEG by `pnpm
assets:generate`. Their checksums are enforced by the source-integrity check.

The footer logo has 144 by 144 and 288 by 288 WebP derivatives with real alpha
transparency, no retained source metadata, and checksums enforced by the
source-integrity check. The original source artwork is not published in this
repository.

The header mark and wordmark are rendered from repository source. No production
asset is loaded from a stock library or a runtime design-platform URL.

## Approved homepage V2

The owner requested the V2 composition and authorized generation of a matching
second photograph after confirming that the original standalone file was absent.
The hero retains the repository-owned table-planning couple. The ready card now
uses `planning-board.jpg`, generated with the built-in image generation tool,
and deterministic responsive AVIF/WebP derivatives. It shows two adult women in
rust and cream at a laptop looking toward a planning board; it is not the hero.

Generation prompt: Create a natural photorealistic landscape lifestyle photograph
of two adult female partners in a warm sunny plant-filled home. The left woman
has dark curly pinned-up hair and a rust blouse; the right woman has light brown
hair in a loose bun and a cream knit sweater. Both smile toward a planning board,
with the woman in cream pointing to a blank note. Include an unbranded laptop,
plain mug and notebook, with both faces and hands visible and room for responsive
cropping. Use warm morning light and realistic skin texture. No legible writing,
logos, green graphic panel, website UI or watermark. Generate a distinct scene
from the male-and-female hero couple.

`papaya-wordmark-v2.svg` is an actual path-based vector trace of the owner's
supplied joined PNG wordmark, created at their request to remove raster blur.
The trace preserves the lettering silhouettes and uses flat dark, orange, coral
and green fills; the raster texture is intentionally removed. It contains 36
paths, no embedded bitmap, and no font dependency. It is a traced derivative,
not an original designer-supplied vector master. The About page's
existing animated mark remains unchanged.

The full-build byte allowance is now 2 MiB to include two source photographs and
sixteen responsive derivatives. Individual responsive images remain under 100
KiB. The compressed stylesheet allowance is 8 KiB for the V2 responsive layout
and form states; JavaScript and font limits are unchanged.
