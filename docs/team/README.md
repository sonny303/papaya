# Papaya company context and engineering team

## Start here

Papaya Health is building a preparation space for preconception, fertility navigation,
and family-building. The current repository implements the public website and signup
forms, not an authenticated partner-health platform. Source: repository README and
existing project brief, checked 2026-09-10. Clinical claims and new data collection
still require the approvals in the release procedure.

Repository: `sonny303/papaya`. Current stack: React, TypeScript, Vite, Tailwind,
Cloudflare Pages, a submission Function, and D1. Read README.md, package.json,
wrangler.json, and the actual code for current facts. Do not import another project
requirements. Company strategy, partner-account design, and health-tracking scope
remain open unless the founder explicitly decides them.

This is a public-safe context index, not a store for patient records, credentials,
private business discussions, or deployment secrets. Keep private evidence in an
approved access-controlled location. Link only public-safe facts from this repo.

## Organization and ownership

Founder → papaya-engineer (lead) → relevant QA/security review → release manager.
The founder owns product priorities and consequential approvals. The lead owns
requirements, implementation, task routing, and continuity. Specialists report
findings to the lead; the release manager owns release evidence and shipping.

| Role                  | Take work when                                                                | Handoff is ready when                                                                  |
| --------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| papaya-engineer       | A requirement or defect needs implementation                                  | Acceptance criteria, scoped diff/PR, checks, and source identity are recorded          |
| papaya-qa             | User journeys, forms, UI, accessibility, or browser behavior change           | Relevant results and reproducible defects identify the tested source                   |
| papaya-security       | Data, access, logging, integrations, dependencies, or trust boundaries change | Material risks have evidence and a disposition; unknowns remain explicit               |
| papaya-releasemanager | A reviewed candidate is proposed for release                                  | Exact candidate, required approvals, hosted checks, target, and rollback are evidenced |

QA/security can review in parallel if independent. The lead owns fixes and prevents
conflicting edits. Specialists may request a bounded follow-up through the lead;
no unbounded chains of agents. Never start a separate user-visible task unless requested.

## Lean 3M workflow

- **Muda (waste):** one small requirement and PR; reuse tools and evidence. No mandatory cleanup pass, duplicate release scripts, or four-agent ceremony for a typo.
- **Mura (uneven work):** use the same short handoff below. Recheck source when it changes; reuse evidence only for the source and environment it actually tested.
- **Muri (overload):** one active implementation owner per task; bounded specialist assignments. After two identical failures, change the diagnostic approach before retrying; ask the founder only for a missing decision, access, or authorization.

Inspect → state acceptance criteria → implement authorized scope → relevant review
and verification → update handoff. A routine local change does not need repeated
approval. Ask once for an unresolved material product/architecture decision.
Production, destructive operations, and new sensitive-data collection require
explicit applicable authorization. Do not reinterpret task approval as release approval.

Keep source changes tied to a PR with requirements and verification. Local preparation
may precede that PR; say clearly when work is only local. Required failed checks block
that candidate. Unrelated work can continue. Optional improvements do not become gates.

## Handoff to an agent or next session

Keep one short task record in the PR description, or a local draft while no PR exists:

```text
Task / acceptance criteria:
Owner → next owner:
Repo / branch / commit / PR (or local diff and changed files):
State: IN_PROGRESS | READY_FOR_REVIEW | BLOCKED | READY_FOR_RELEASE | DONE
Changes and decisions (include decision source):
Evidence: command/check, result, date, tested source and environment
Open risks / unverified checks:
Next action (one concrete step):
Approval scope, if applicable:
```

The receiver checks source identity and open items before accepting ownership.
DONE means the requested scope is verified; it never implies deployed unless deployment
was requested and proved. Distinguish local tests, hosted runtime proof, and production
authorization. Mock tests and verify:dist do not prove live delivery or deployment.

## Sources and learning

- README.md and source: current implementation and tooling.
- docs/support-matrix.md: browser/accessibility evidence required for release.
- docs/operations/release.md: canonical approvals and release protocol.
- docs/operations/rollback.md and incident-response.md: recovery procedures.
- Task PR/handoff: current work, decisions, evidence, next owner.

Record only reusable, evidenced lessons in the task PR: date, observation, evidence,
and where it applies. The lead folds durable lessons into the relevant existing doc;
no automatic rule changes after every error, and no separate growing diary.

## Agent installation

Canonical role files live in this repository's .cursor/agents directory. Open the
repository as the project for clients supporting this layout. The surrounding Papaya
workspace links to these files locally; those links are convenience, not versioned
installation. For other clients, explicitly read the role file and delegate its task
through that client's supported agent mechanism. Verify invocation rather than assume
all clients discover Cursor-format agents. No global installation is required.

## Use across tools

Open this project in a fresh session after configuration changes. Ask:
“Use papaya-engineer; read the team handbook and current handoff, then continue.”
Substitute a specialist name for a bounded review.

| Tool        | Project entry point                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Codex       | AGENTS.md and .codex/agents/*.toml                                                                             |
| Cursor      | .cursor/agents/*.md and always-applied team rule                                                               |
| Gemini CLI  | GEMINI.md and .gemini/agents role links                                                                        |
| Antigravity | GEMINI.md, .agents/rules, and /papaya-engineer, /papaya-qa, /papaya-security, /papaya-releasemanager workflows |

Adapters exist at both the surrounding workspace and repository roots. Canonical
behavior stays in .cursor/agents; adapters load those files. Antigravity workflows
can perform the role in-session when native delegation is unavailable. No model
or permission overrides are installed. Client trust and feature availability apply.

The release manager MUST stop at the dossier until the founder types
`start deployment` for the exact candidate and target. This supplements existing
release approvals; prompt rules are not provider access controls.

Configuration references checked 2026-09-10:

- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Gemini subagents](https://geminicli.com/docs/core/subagents/)
- [Antigravity rules](https://antigravity.google/docs/rules-workflows)

Verification: explicit Codex role invocation and static adapter checks. External
client sessions have not been executed; no claim of universal native discovery.
