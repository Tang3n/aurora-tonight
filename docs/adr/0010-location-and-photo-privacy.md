# 10. Location and photo privacy by default

- Status: Proposed
- Date: 2026-11-19

## Context

Users report from where they stand, often near home. Phone photos carry EXIF GPS coordinates and device data. The
service runs in the EU/EEA, so GDPR applies: a lawful basis, data minimisation, the right to erasure, and a privacy
policy.

## Decision

- **EXIF**: photos are decoded and re-encoded in the browser (canvas → WebP), which drops all metadata, before
  upload. Only exposure, ISO and focal length are read first and sent as separate fields, with the user's consent.
- **Sizes**: upload a ~2048 px image and a ~400 px thumbnail; lists and maps use thumbnails only.
- **Location precision**: the user picks "this spot", "~1 km" or "~10 km" per report. The server rounds the stored
  point accordingly (a trigger, not only the UI), so precise coordinates never reach the database when the user
  chose a coarse level.
- **Erasure**: deleting the account cascades to the user's profile, sightings, photos and storage objects
  (`ON DELETE CASCADE` from `auth.users`, plus a function that removes storage files).
- A short privacy policy and terms (users keep copyright and grant a licence to display) before launch.

## Alternatives

- **Strip EXIF on the server**: works, but the original with GPS would already have been uploaded.
- **Always coarse locations**: safer, but spot pages need exact positions for public viewpoints.

## Consequences

- Original-quality files are never stored; that is acceptable for a sightings app.
- Client-side processing must handle HEIC from iPhones (browser support varies); fall back to rejecting with a
  clear message.
