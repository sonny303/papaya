# Release procedure

This procedure separates source approval, artifact verification, hosted runtime
proof, and production authorization. A green CI run never deploys or authorizes
production by itself.

## Required roles

- Release operator: prepares the candidate and records evidence.
- Product approver: confirms public behavior and copy.
- Legal/privacy approver: approves claims, policies, and any data collection.
- Technical approver: confirms CI, hosted checks, monitoring, and rollback.

One person may hold more than one role, but every approval must be explicit and
dated in the release pull request or the hosting provider's protected approval
record.

## Preconditions

- `main` is protected and required CI checks are current.
- Legal text, public claims, launch geography, and any conversion flow are
  approved for the release.
- The repository is connected through OAuth to a dedicated Papaya hosting
  project. No deployment credential belongs in this repository.
- `PUBLIC_SITE_ORIGIN` is configured as the public HTTPS origin for production.
- Monitoring and its alert destination have been tested.
- A known-good production deployment is available for rollback.

## Candidate verification

1. Select one full Git commit from protected `main`.
2. Confirm CI built once, created `dist/release-manifest.json`, and passed the
   downloaded-artifact, browser, accessibility, security, and Lighthouse gates.
3. Download the bounded provenance record and confirm its commit, workflow run,
   build-artifact ID and digest, and publication mode. Confirm the manifest tree
   hash from the downloaded candidate.
4. Deploy that commit to the dedicated Preview environment.
5. On the immutable Preview URL, verify every public route, unknown-route 404,
   redirects, response headers, responsive image selection, and preview
   `noindex` behavior.
6. Complete the hosted browser, keyboard, 200% zoom, reduced-motion, and
   assistive-technology matrix in `docs/support-matrix.md`.
7. If a conversion flow is enabled, prove one durable delivery plus invalid,
   duplicate, offline, timeout, retry, abuse-control, and delivery-failure cases
   without submitting health information.

The CI artifact is intentionally Preview-safe. Until the host supports deploying
that exact artifact with production metadata, runtime provenance is the exact
source commit rather than byte-for-byte identity between Preview and production.
Record that evidence boundary in the release approval.

## Production authorization

1. Obtain the product, legal/privacy, and technical approvals.
2. Build production from the approved commit with the production environment and
   public origin. Do not build from an unreviewed branch or working tree.
3. Before attaching the public domain, retrieve `/release-manifest.json` from
   the immutable production URL and verify its source revision, publication
   mode, public origin, canonical URLs, social metadata, sitemap, robots
   policy, headers, redirects, 404 status, and monitoring.
4. Attach or promote the public domain only after all checks pass.
5. Re-run the critical route and monitoring checks on the public origin.

Stop the release on any source mismatch, missing approval, failed required
check, unverified rollback target, unexpected data collection, or wrong hosting
scope.
