# Rollback procedure

Rollback restores the last verified production deployment; it is not an
opportunity to rebuild or add an unreviewed fix.

## Trigger

Rollback for broken primary routes, unsafe or false public content, incorrect
indexing, missing security headers, sustained availability failure, material
performance regression, or a failed conversion path when that path is enabled.

## Procedure

1. Pause new releases and open an access-controlled incident record.
2. Identify the last known-good production deployment and confirm its full source
   commit, production manifest, approval record, and prior smoke result.
3. In the dedicated Papaya hosting scope, restore or promote that immutable
   deployment. Do not rebuild it during containment.
4. Verify the public domain resolves to the selected deployment.
5. Check `/`, `/who-we-serve`, `/about-us`, `/terms`, `/privacy`, an unknown route,
   canonical metadata, robots and sitemap, response headers, and monitoring.
6. If conversion is enabled, perform its approved non-sensitive delivery check.
7. Record the restored deployment, commit, verification result, and follow-up
   issue. Keep security, personal-data, and credential details out of the public
   repository.

If no verified deployment is safe, remove the affected public entry point or
serve an approved maintenance response through the hosting provider, then keep
production blocked until a new candidate completes the release procedure.
