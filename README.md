# Papaya Health

Public website for Papaya Health, built with React, TypeScript, Vite, and Tailwind CSS.
Production host: Cloudflare Workers static assets.

## Local development

Requirements:

- Node.js 22.18
- pnpm 11.19

```bash
pnpm install --frozen-lockfile
pnpm dev
```

## Quality checks

```bash
pnpm verify
pnpm test:e2e
```

`pnpm verify` runs public-repository and source-integrity checks, type checking,
linting, unit tests, the production build, and a public-bundle scan.

## Deploy (Cloudflare)

```bash
pnpm build
pnpm deploy
```

Requires Cloudflare credentials (`CLOUDFLARE_API_TOKEN` and account access).
See `docs/operations/release.md` for production gates.

## Structure

- `src/components` contains shared interface components.
- `src/pages` contains the public routes.
- `src/data` contains static public-page content.
- `public/assets` contains repository-managed runtime assets.
- `workers/site.ts` serves static assets, SPA routes, 404s, and security headers.
- `host-contract.json` is the verified host routing and header contract.
- `wrangler.json` configures the Cloudflare Workers static deployment.
- `docs/design-provenance.md` records the approved design import.

Runtime dependency licenses are published in
[`public/THIRD_PARTY_NOTICES.txt`](public/THIRD_PARTY_NOTICES.txt) and shipped
with the production build.

GitHub is the source of truth for production code after the initial design import.
