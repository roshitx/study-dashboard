# #15 — Google owner authentication

## Scope

Google OIDC sign-in for one owner; server-side D1 sessions; clean logout. TanStack Start/React/Cloudflare Workers remain unchanged. Sheets/Calendar API grants, academic metadata, remote provisioning and deployment are outside this deliverable. Google sign-in and D1 session design were selected by the user.

## Trust boundary

Use a maintained OIDC/OAuth library for protocol validation rather than hand-written JWT verification or cryptography. Request only openid/email/profile. Validate issuer, audience, nonce, state and PKCE; reject unverified email and identities outside the privately configured owner allowlist. Callback URL is fixed configuration, not client-selected. Do not persist Google access/refresh tokens when identity validation is complete.

Owner identity, OAuth client credentials and redirect origin come from Worker bindings/secrets. Never request secrets in chat; never expose them through VITE variables, logs, errors or browser responses. Missing configuration fails closed with not_configured.

## Sessions

D1 stores opaque session token hashes, owner identity and expiry; raw session tokens only travel in HttpOnly, Secure, SameSite=Lax cookies. Use cryptographically random tokens from the platform. A local D1 migration is part of #15 because sessions require storage; domain metadata remains #16. Expired, missing and revoked sessions are denied. Authorization is checked server-side on every private endpoint, not inferred from UI state. Authentication responses use no-store.

OAuth transaction state is short-lived, browser-bound and consumed once. Logout is a same-origin POST; reject foreign/missing Origin. Delete the server session and expire cookies. Do not promise physical browser-memory erasure.

## Browser

Login state is explicit: loading, signed out, owner, not configured or error. Login triggers the actual Google redirect, not a fake success. Existing synthetic demo may remain public, explicitly separated from the authenticated workspace; private data endpoints are always protected. Logout unmounts sensitive workspace state and clears snapshot/index/drafts/file selection. In-flight work must not restore sensitive state after logout. No plaintext is placed in server loaders, HTML, D1 or build assets.

## Verification

Run migration against local D1; exercise real Worker routes for unauthenticated/foreign-owner denial, missing configuration, callback mismatch/replay, expired/revoked session and foreign-origin logout. Use synthetic identity-provider fixtures only for deterministic security tests, not as evidence of live Google compatibility. Verify browser logout cleanup including pending work, keyboard/mobile and private-cache behavior. Run frozen install, bun test, build and typecheck. Record exact evidence and limitations.

Live Google owner login requires an app-owned OAuth client, private owner configuration and registered callback. If unavailable, finish all local implementation and report live acceptance unverified; do not claim the milestone fully proven or deploy private endpoints to compensate.
