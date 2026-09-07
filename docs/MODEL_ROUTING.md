# Model Routing Policy

This repository uses a cost-aware two-tier model strategy.

## Goals

- Use `gpt-5.6-sol` for routine planning, decomposition, documentation, state tracking, repository exploration and ordinary implementation reasoning.
- Reserve `gpt-6-astra` for small amounts of high-consequence reasoning where a stronger independent review is worth the higher token price.
- Keep coding-model choice independent from planning-model choice when another coding environment is used for implementation.
- Never spend Astra tokens on work that can be safely completed and verified by Sol.

## Default routing

| Work | Default model | Reasoning |
|---|---|---|
| Repository inspection / phase detection | `gpt-5.6-sol` | low/medium |
| README → PRODUCT_SPEC | `gpt-5.6-sol` | medium |
| USER_FLOWS | `gpt-5.6-sol` | medium |
| IMPLEMENTATION_PLAN / task tree | `gpt-5.6-sol` | medium |
| PROJECT_STATUS / doc synchronization | `gpt-5.6-sol` | low |
| Research synthesis | `gpt-5.6-sol` | medium/high |
| Architecture first draft | `gpt-5.6-sol` | high |
| Database/RLS first draft | `gpt-5.6-sol` | high |
| Architecture final gate review | `gpt-6-astra` | high |
| Database/RLS authorization final gate review | `gpt-6-astra` | high |
| Security review | `gpt-6-astra` | xhigh |
| First vertical-slice audit | `gpt-6-astra` | high |
| P0/P1 root-cause analysis | `gpt-6-astra` | high/xhigh |
| Release/security final gate | `gpt-6-astra` | xhigh |

## Astra escalation rules

Use Astra only when at least one condition is true: architecture/data ownership can materially change; auth/RLS/secrets/privacy/payments/destructive behavior is being finalized; a P0/P1 defect is suspected; first vertical slice is ready for independent gate review; a release gate is being evaluated; two Sol passes disagree on a high-impact decision; or the user explicitly requests Astra.

## Budget discipline

Prefer one focused Astra review per gate. Give Astra only relevant artifacts, request findings/minimal corrections rather than whole-repository rewrites, and record experiment runs in `docs/AI_RUN_LOG.md` when present.

## Runtime compatibility

If `gpt-6-astra` is unavailable, use `gpt-5.6-sol` with high/xhigh reasoning and mark the review `FALLBACK`; never claim an Astra review occurred when another model actually ran.

## External implementation model

Implementation may be executed by Claude, Astra, or another capable coding agent. Regardless of model, the implementation agent must follow `AGENTS.md`, approved docs, `docs/PROJECT_STATUS.md`, `docs/IMPLEMENTATION_PLAN.md`, and phase gates.
