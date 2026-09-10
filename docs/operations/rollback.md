# Rollback

## Application rollback

Cloudflare Workers versions can be rolled back without a new source change:

```bash
pnpm exec wrangler versions list
pnpm exec wrangler rollback
# or: pnpm exec wrangler rollback <VERSION_ID>
```

Record the prior known-good version ID in the release dossier before promotion.

## DNS / domain

If a nameserver or custom-domain change caused the incident, restore the last
known-good Cloudflare DNS records or temporarily point traffic to the prior
workers.dev/version URL only with founder authorization. Squarespace registrar
NS changes can take time to propagate; do not thrash NS settings.

## Data

This static site has no application database. Application rollback does not
restore any third-party form or analytics data that may be added later.
