# Owner Google Authentication Implementation Plan

**Goal:** Implement issue #15 locally: owner-only Google OIDC, revocable D1 sessions, clean browser logout.

**Architecture:** Worker-only auth integration using oauth4webapi and local D1. TanStack server routes dispatch to a shared handler; React session boundary owns workspace lifetime. No Google API grant, remote provisioning or deployment.

**Tech Stack:** Existing TanStack Start/Router, React, TypeScript, Cloudflare Workers, Bun; exact oauth4webapi dependency.

## Constraints

- Callback initially http://localhost:3000/api/auth/google/callback; localhost-only development cookie exception, Secure required outside literal loopback.
- Google client/owner values are private Worker bindings; missing values fail closed. Google issuer/endpoints are fixed, never client-selectable.
- OAuth transaction is browser-bound, short-lived, atomically consumed; nonce/state/PKCE verified by maintained library. Google tokens never persisted or returned.
- D1 stores session hashes/owner/expiry, no notes. Logout same-origin POST revokes session; client unmounts sensitive workspace before sending logout so errors cannot retain plaintext.
- Public synthetic shell/local importer remains usable without configured auth; clearly distinct from protected session endpoints. No live data integration exists.

## Implementation

- [ ] Add oauth4webapi exact version; read installed types for OIDC signature verification and response processing. Add Worker types only when needed through existing Wrangler tooling.
- [ ] Add auth-only D1 migration in separate migrations directory, avoiding premature academic-schema rollout. Configure a strictly local D1 binding without remote database ID; remote deployment remains disabled.
- [ ] Implement src/integrations/auth.server.ts: read/validate bindings; hash random tokens; fixed cookie policy; D1 transaction/session operations; Google login/callback; GET session and POST logout. Generic errors/no-store/referrer policy on every response, no provider secrets/errors logged. Bind sessions to configured Google subject/email identity and recheck current allowlist each request. Expiry fixed, no implicit extension.
- [ ] Add TanStack API route files for /api/session, /api/auth/google/login, /api/auth/google/callback, /api/auth/logout; keep Worker bindings server-only.
- [ ] Security tests use real SQLite with a minimal D1-compatible wrapper and synthetic protocol requests. Cover missing config, foreign origin, bad state/browser binding, callback replay/expiry, session expiry/revocation/owner mismatch. Tests exercise consumer-visible responses, not source text. Provider success requires actual OIDC validation, not a bypass endpoint.
- [ ] Add session boundary using existing controls; session GET after hydration only, no plaintext server loader. Logout unmounts workspace synchronously, POSTs revoke, reports uncertainty if network fails. Confirm state cannot reappear from outstanding importer promises or stale session fetch. Other-tab logout broadcasts only an invalidation signal, never plaintext.
- [ ] Run local migration and Worker HTTP smoke for unauthenticated/not-configured/Origin behavior. Browser: synthetic local import then logout clears workspace, keyboard/mobile. Obscura first, ask before Chromium fallback. Never upload private screenshot/content to design services; auth UI is existing-component wiring, no redesign.
- [ ] Run bun install --frozen-lockfile, bun test, bun run build, bun run typecheck. Inspect server/client artifact boundaries for credentials. Run Jev if configured. Update README, architecture/configuration, decisions and validation with observed evidence/live limitations. Commit/push one PR to main, never merge automatically.

## Live prerequisite

No local OAuth credentials currently exist. Finish implementation/local security verification, provide private .dev.vars setup instructions, then ask the user to complete Google client setup locally. Actual Google login/owner denial/provider compatibility must remain explicitly unverified until exercised; no credentials requested in chat.
