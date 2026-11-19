# 12. No social feed, chat, comments or follows

- Status: Superseded by ADR 14 (accepted 2026-11-19, withdrawn the same day: no accounts, no backend)
- Date: 2026-11-19

## Context

Community features tend to grow by default: a feed, likes, comments, chat, followers. Each one multiplies moderation
work and legal exposure for user-generated content, and none of them helps answer "should I go out, and where?".
This is a one-person side project.

## Decision

- Photos are shown attached to spots and sightings, not in an endless feed.
- No comments, chat, direct messages or followers.
- Moderation minimum: sign-in required to post, a daily upload limit per user, a "report" button, automatic hiding
  after N reports, and an admin view (a protected page or the Supabase dashboard).

## Alternatives

- **A feed of the latest photos**: more engaging, and competitors have it; we can add a read-only "tonight's
  photos" strip later without comments.

## Consequences

- Much smaller moderation and abuse surface.
- Less engagement than social aurora apps; the product has to win on usefulness (ADR 6, ADR 9).
