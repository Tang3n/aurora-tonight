# 3. Static hosting on GitHub Pages; the web is the primary channel

- Status: Accepted (hosting retroactive 2026-11-18; web-first added 2026-11-19)
- Date: 2026-11-19

## Context

All data sources (NOAA SWPC, MET Norway, Open-Meteo) allow CORS, so the whole forecast can run in the browser. The
project is a portfolio piece with no budget. Spot pages and the scorecard are meant to be shared as links, which
opens them on any device, often a laptop.

## Decision

- Build to static files and deploy to GitHub Pages from `main` via GitHub Actions (`.github/workflows/deploy.yml`:
  `npm test`, `npm run build`, upload `dist/`).
- Treat the web as the primary product. Make it an installable PWA (manifest, service worker for the app shell and
  last forecast). Native apps wrap the same code (see ADR 5).
- When a backend arrives (ADR 8), the frontend stays static; it talks to the backend over HTTPS from the browser.

## Alternatives

- **Netlify / Vercel / Cloudflare Pages**: equivalent for static files and add preview deploys, but GitHub Pages is
  already set up and next to the repo.
- **Native-first app**: better background work and notifications, but two codebases and no shareable links.

## Consequences

- Hosting costs nothing and has no servers to patch.
- No server-side rendering: shared links to spots get generic link previews unless we pre-render Open Graph pages
  at build time for known spots.
- iOS supports Web Push only for PWAs added to the home screen (iOS 16.4+); this limits alerts on iPhone.
