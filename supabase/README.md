# Supabase

This directory is the repository-local home for Dance AI database migrations, Edge Functions, and authorization tests.

No remote Supabase project is modified by Phase 0.

## Planned structure

- `migrations/` — forward SQL migrations created from `docs/DATABASE.md` beginning in Phase 2.
- `functions/` — trusted Edge Functions for upload allocation/finalization and deletion orchestration.
- `tests/` — pgTAP/SQL allow-and-deny tests for tables and Storage policies.

When a compatible Supabase CLI + Docker environment is available, initialize/reconcile the local project config before Phase 2 migration work. Do not weaken RLS or expose the service role to the mobile app to simplify local development.
