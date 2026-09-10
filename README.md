# Papaya Health

Public website for Papaya Health, built with React, TypeScript, Vite, and Tailwind CSS.

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
pnpm performance:lighthouse
pnpm release:verify
```

`pnpm verify` runs public-repository and source-integrity checks, type checking,
linting, unit tests, the production build, route-metadata validation, a
public-bundle scan, and deterministic performance budgets. Lighthouse uses the
installed Playwright Chromium binary and does not require credentials.

From a clean Git checkout, `pnpm verify` also creates and verifies
`dist/release-manifest.json` containing the exact source revision and hashes
for every built file. CI uploads that manifest with one candidate artifact and
all later jobs verify the same downloaded output instead of rebuilding it.
Bounded JSON evidence records retain source, artifact, and browser outcomes;
deployment and smoke-test fields remain explicitly empty until hosted proof
exists.

Responsive AVIF and WebP assets are regenerated from the approved JPEG with
`pnpm assets:generate`.

## Deployment metadata

Preview builds are always emitted with `noindex` metadata and a disallowing
`robots.txt`. Production builds require `PUBLIC_SITE_ORIGIN`, set to the public
HTTPS origin without a path. This setting is not a credential. Canonical URLs
and the sitemap are emitted only when the deployment environment is
`production`.

## Structure

- `src/components` contains shared interface components.
- `src/pages` contains the public routes.
- `src/data` contains static public-page content.
- `public/assets` contains repository-managed runtime assets.
- `docs/design-provenance.md` records the approved design import.
- `docs/support-matrix.md` defines browser, responsive, and assistive-technology coverage.
- `docs/vulnerability-policy.md` defines the dependency vulnerability gate.
- `docs/operations/release.md` defines production authorization and evidence.
- `docs/operations/rollback.md` defines immutable-deployment rollback.
- `docs/operations/incident-response.md` defines public-site incident handling.
- `wrangler.json` configures Cloudflare Pages and D1 bindings; `public/_headers`
  defines security headers. Cloudflare serves extensionless HTML routes and the
  checked-in `404.html` handles unknown paths.

Runtime dependency licenses are published in
[`public/THIRD_PARTY_NOTICES.txt`](public/THIRD_PARTY_NOTICES.txt) and shipped
with the production build.

GitHub is the source of truth for production code after the initial design import.

## Cloudflare hosting

The website runs on Cloudflare Pages with a Pages Function at `/api/submit`
and private D1 storage. Apply `migrations/0001_signups.sql` before enabling forms.
Preview and production use separate D1 databases. `SUBMISSION_HASH_SECRET` is a
Cloudflare secret; never commit its value. `PAPAYA_ENV` selects the record namespace.

Build preview metadata by default. For production, set
`PAPAYA_DEPLOYMENT_ENV=production` and `PUBLIC_SITE_ORIGIN=https://www.papayahealth.com`.
Deploy the verified output with Wrangler Pages. GitHub remains the source of truth.
