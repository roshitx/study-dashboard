---
name: study-dashboard-context
description: "Use when onboarding or implementing Study Dashboard UT milestones, privacy boundaries and source-preserving imports."
---

# Study Dashboard UT

Read README.md, docs/PRD.md, docs/ARCHITECTURE.md, docs/TASKS.md, docs/AGENT_START.md and docs/DECISIONS.md before implementation. Follow AGENTS.md; current tracker outranks historical status.

- Repository roshitx/study-dashboard public; one deliverable branch/PR based on current main, no automatic merge. Query native blockers and PR state before selecting work.
- Preserve TanStack Start/Router, React, TypeScript, Vite, Cloudflare Workers; Bun 1.4+, exact dependencies/bun.lock. CLI bunx --bun; no npm/npx.
- UI shadcn/ui Base UI Nova/Tailwind v4; incremental existing-component reuse, anti-slop during work selected by user.
- Source ZIPs/manifest/plaintext remain ignored local files; never public, SSR, logs, GitHub, screenshots uploaded or CI artifacts. Fixture repo synthetic.
- Preserve bytes/unknown metadata, distinguish semester vs UT period, registration vs BMP code, module vs session, note vs submission status, null vs zero, checkbox answer vs task. No arbitrary note/plugin JS.
- M1 #9–#14 merged historically; local importer/index/navigation/reader/editor/layered export/query acceptance. Actual source counts 486 notes/13 hubs and 51 identical English files are evidence, not constants. Independent English archive was unavailable for #14 re-verification; derived subset tested.
- #15 user selected Google sign-in, revocable D1 session, localhost callback. Draft PR #36 historical delivery; verify live status. oauth4webapi server-only; separate migrations-auth local D1 session schema. OAuth credentials/owner .dev.vars privately, never chat; API grants Sheets/Calendar separate. Live Google acceptance not established by local tests.
- Cookie Secure HTTPS, literal loopback HTTP exception. Logout unmounts browser workspace, clears sensitive references, cross-tab invalidation; no promise physical memory erasure. Dirty navigation guard must not block security logout.
- Before live data server endpoints: owner auth/resource allowlist, validation/limits, no-store, writes Origin/CSRF. Main vault writes require actual version-specific Remotely Save Mac-web-Mac/recovery proof, separately rename/delete. Vault password browser only, never server env; use compatible crypto, no custom replacement.
- Verify bun install --frozen-lockfile, bun test, bun run build, bun run typecheck. Typecheck now runs Wrangler types first; generated Worker declaration ignored. Build generates route tree. Runtime/provider proof separate.
- If nested workerd package malformed/signature invalid while top-level works: inspect package integrity, frozen force reinstall repaired observed issue; do not substitute mismatched binaries or fake generated types. Concurrent dev servers sharing optimizer can yield stale chunks; restart targeted service --force.
- Browser Obscura first; failed hydration historically required explicit per-task Chromium fallback approval. Close test sessions/services, leave persistent Obscura service.
- D1 metadata remote, R2, Google API grants and deployment are separate gates; no deploying to simulate unavailable live acceptance.
