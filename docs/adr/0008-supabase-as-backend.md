# 8. Supabase as the backend for accounts, reports and photos

- Status: Accepted
- Date: 2026-11-19

## Context

Phase 2 adds accounts, sightings, photos, saved spots and moderation. That needs authentication, a relational
database with geographic queries ("reports within 50 km in the last 30 minutes"), object storage and a scheduler.

Constraints: no budget; a side project, so little time for operations; the frontend stays static (ADR 3); the big
backend learning project is CrateDigger (Kotlin, Ktor, Kafka), so building a second custom backend here would mostly
repeat it.

Supabase free plan, checked 2026-11-19 on supabase.com/pricing and secondary sources: 500 MB database, 1 GB file
storage, 5 GB egress, 50,000 monthly active users, two active projects; projects pause after 7 days of inactivity;
no downloadable backups on the free plan.

## Decision

Use Supabase:

- **Auth**: email magic link and Google sign-in.
- **Postgres + PostGIS**: `geography(Point)` columns, `ST_DWithin` for radius queries, GiST indexes.
- **Row Level Security** on every table: public read of non-hidden rows; insert, update and delete only where
  `user_id = auth.uid()`. The browser talks to the database directly through `supabase-js`; there is no custom API.
- **Storage** for photos (ADR 10), **Edge Functions** (Deno) and **pg_cron** for alerts (ADR 11).
- Schema as SQL migrations in `supabase/migrations/`, run locally with the Supabase CLI, so the database is
  reproducible and reviewable.

## Alternatives

- **Custom Ktor + Postgres on a VPS**: full control and good practice, but duplicates CrateDigger and adds
  operations work (TLS, backups, updates).
- **Firebase**: mature auth and push, but Firestore has no real geographic queries or SQL, and the validation work
  wants SQL.
- **PocketBase**: one binary with SQLite, simple, but still needs a host to run on.

## Consequences

- Most backend work becomes SQL: schema, RLS policies, a few functions. Security depends on getting RLS right, so
  every policy gets a test (pgTAP or SQL tests via the CLI).
- Free-plan risks to handle: pausing (the alert cron must keep the project active; verify), no backups (add a
  weekly `pg_dump` from GitHub Actions to a private place), and storage/egress limits (thumbnails, ADR 10).
- Vendor lock-in is moderate: it is Postgres underneath, and Auth and Storage could be replaced if needed.
