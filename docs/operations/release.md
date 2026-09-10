# Release procedure

Canonical production release protocol for the Papaya public website.

## Scope

Production host: Cloudflare Workers static assets (`wrangler.json`).
Candidate identity: exact git commit SHA on an approved PR branch or `main`.
This site is static. No D1, Functions, or new data collection without a separate
founder-approved scope change.

## Gates

1. Acceptance criteria recorded in the PR/handoff.
2. `pnpm verify` and required CI checks pass on the candidate commit.
3. Relevant QA/security review when UI journeys or trust boundaries changed.
4. Hosted preview or workers.dev proof against that exact commit when available.
5. Release dossier presented by papaya-releasemanager.
6. Founder types `start deployment` for the **exact** candidate commit and
   target (`production` / `papayahealth.com`). Prior setup approval is not
   production approval. A changed commit requires a fresh dossier.

## Deploy

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler deploy
```

Attach or confirm custom domains only after the Cloudflare zone for
`papayahealth.com` is active. Record deployment ID/version, URL, and commit.

## After deploy

Verify public HTTPS for `/`, known SPA routes, unknown-path HTTP 404, and
required security headers. Record evidence with date and tested source.
On failure, follow `rollback.md` and `incident-response.md`.
