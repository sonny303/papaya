# Public-site incident response

Operational evidence belongs in the monitoring and hosting systems. Sensitive
incident details, personal data, credentials, private contacts, and private URLs
must not be committed to this public repository.

## Ownership

- Incident lead: severity, coordination, and closure.
- Technical lead: containment, diagnosis, rollback, and runtime verification.
- Product lead: public experience, claims, and stakeholder decisions.
- Privacy/security lead: data or security assessment and required notifications.

## Severity

| Level    | Examples                                                                                               | Initial action                                                       |
| -------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Critical | Wrong hosting scope, credential exposure, personal-data exposure, or unsafe health claim               | Contain immediately, preserve evidence, notify privacy/security lead |
| High     | Site unavailable, primary routes broken, incorrect production indexing, or conversions failing broadly | Pause releases and begin rollback                                    |
| Medium   | Material browser, accessibility, metadata, or performance regression                                   | Triage promptly and block the next release                           |
| Low      | Cosmetic defect with no task, safety, privacy, or availability impact                                  | Track through the normal backlog                                     |

## Response

1. Confirm the symptom from an independent network and capture the deployment,
   source commit, route, status, and monitoring signal.
2. Set severity and pause releases. Do not paste credentials or submitted data
   into tickets, chat, logs, or this repository.
3. Contain using `docs/operations/rollback.md` or disable only the affected
   public entry point through the hosting provider.
4. Validate the public origin after containment, including routes, headers,
   indexing controls, and monitoring.
5. Create a narrowly scoped fix with a regression test and normal pull-request
   review. Do not patch production outside the source-of-truth repository.
6. Close only after the fix or rollback is verified and follow-up work has an
   owner and due date in the authorized tracking system.

Exercise availability, bad deployment, indexing, header, and rollback scenarios
before launch and at least after material hosting or workflow changes. Add form
delivery, duplicate, timeout, and abuse scenarios when a conversion flow exists.
