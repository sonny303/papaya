# Incident response

1. Confirm impact: public site unavailable, incorrect content, TLS/DNS failure,
   or security-header regression.
2. Preserve evidence: failing URL, status codes, headers, Cloudflare version ID,
   commit SHA, and timestamp (UTC).
3. Mitigate within approved scope: Workers rollback (`rollback.md`), DNS fix, or
   temporary maintenance only with founder authorization for production.
4. Notify founder with impact, mitigation, and next verification step.
5. After mitigation, re-verify public HTTPS and record the outcome in the task
   handoff/PR. Open a follow-up for root cause if needed.

Do not collect new sensitive data or change product scope during an incident.
