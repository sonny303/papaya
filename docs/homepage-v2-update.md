# Homepage V2 update — draft

## Requirement

Implement the supplied approved V2 homepage in the existing React application,
then publish the verified release on www.papayahealth.com through GitHub and
Cloudflare Pages. Preserve the other public pages and the animated About mark.

## Acceptance criteria

- Long-copy peach hero, table-planning photo, waitlist and clinic actions.
- Patient, partner, clinic cards in order with bottom-aligned actions.
- Distinct planning-board photo on the left of the forest-green ready card;
  right-aligned desktop copy, stacked mobile layout.
- Separate blush first-step and yellow Coming soon assessment panels.
- Supplied joined wordmark, complete disclaimer, 2026 copyright.
- Real durable waitlist and clinic delivery; working audience and legal routes.
- Responsive browser verification, repository checks, reviewable GitHub PR,
  dedicated Cloudflare Pages project, public-domain HTTPS and runtime checks.

## Implemented

The hero retains the table-planning couple. The lower ready card now uses a newly
generated, distinct planning-board scene with two adult women in rust and cream,
authorized by the owner. Both photographs have responsive AVIF/WebP variants.
The joined wordmark, separate first-step and Coming soon assessment panels,
responsive cards and new waitlist/clinic forms are implemented.

The waitlist collects email and explicit launch-update consent. The clinic form
collects email, name, clinic name and pilot-contact consent. The server retains
only these fields, consent version and server timestamp. A Cloudflare Pages
Function writes to private D1 storage using an atomic batch, duplicate prevention,
hourly rate limits and HMAC-hashed IP identifiers. No success is displayed until
storage confirms saving. Secrets never enter the client bundle.

## Hosting and remaining launch work

Cloudflare Pages project: `papaya-health`; production branch: `main`.
Draft preview: https://homepage-v2.papaya-health.pages.dev

- Separate production and preview D1 databases are initialized with the schema.
- Each environment has its own submission hash secret.
- Real waitlist and clinic requests saved successfully; duplicate retries produced
  one record. D1 readback confirmed preview records and zero production records.
- Invalid submissions returned 400; foreign-origin submissions returned 403;
  exceeding the hourly limit returned 429. Both forms also passed real browser
  submission and D1 readback. Five public routes returned 200, unknown routes 404,
  and the mobile homepage had no horizontal overflow.
- The unused, empty Vercel project was deleted. Upstash is no longer required.
- The Cloudflare zone remains pending. Registrar nameservers must be changed to
  `alex.ns.cloudflare.com` and `gemma.ns.cloudflare.com`.
- Obtain the user's requested final checkpoint before committing/publishing.
- Run clean-source release verification, CI, production and domain HTTPS checks.

This is a draft deployment from uncommitted source, not an approved production
release. No custom-domain change or GitHub merge has occurred.

The foundation PR is #7. Local work begins from c58485f on
feat/pr-006-release-readiness, which contains additional verification changes
beyond that PR. The release PR must preserve and account for that history.

## Verification

- 12 component/unit tests passed.
- 5 submission-handler tests passed.
- 40 build/release contract tests passed.
- 60 Chromium layout, accessibility, keyboard, route and image tests passed.
- 2 Chromium form interaction tests passed; 16 visual baselines refreshed.
- 32 Firefox/WebKit page and form checks passed; 4 Chromium-only checks skipped.
- Type checking, lint, formatting, asset integrity and build budgets passed.
- The build contains both photo families and remains below 2 MiB total; largest
  responsive asset remains below 100 KiB.
- Local form browser tests simulate responses; separate hosted HTTP requests and
  private D1 readback now prove actual preview storage.
- The all-ref history scan flags a personal author/committer email in existing
  remote commit `1b583fd0faffcc3c38ff91e1ed68ffad6314302b`. This is not on the
  current local branch; release history needs resolution before publishing.
- Full clean-release verification awaits the approved commit. Obsolete local
  Vercel link and environment files have been removed.

The generation prompt and provenance are recorded in `design-provenance.md`.
