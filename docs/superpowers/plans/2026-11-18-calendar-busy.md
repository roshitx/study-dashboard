# Calendar Busy Ranges Implementation Plan

**Goal:** Read busy intervals for one explicitly selected owner calendar, without event details or writes.

**Architecture:** Extend the authenticated Google read endpoint with calendarId/start/end parameters. Retain inventory scope and add calendar.freebusy for new consent; old grants can still read inventory. Resolve selected IDs against fresh server-side calendar inventory before querying FreeBusy. Use date-only Asia/Jakarta boundaries, inclusive start and exclusive end, maximum 31 days. Reject malformed, partial-error and oversized responses rather than presenting unknown availability as free.

**Tech Stack:** TanStack Start, React, TypeScript, Bun, Cloudflare Workers, installed shadcn Base UI components.

## Tasks

1. Add date-window and busy-response validation in src/domain/calendar.ts; wire existing src/integrations/google.server.ts read endpoint, scope validation and bounded provider POST.
2. Add src/components/calendar-busy.tsx using Field, Input, Select and Button. Replace inventory JSON display in GoogleConnection with this surface. Explicit submit only; stale results cleared on selection changes. No event endpoints.
3. Add tests/calendar.test.ts and endpoint cases in tests/google.test.ts for scope consent, inventory authorization, invalid ranges, old grants, partial errors and normalized busy intervals. Run frozen install/tests/build/typecheck and attempt Obscura UI inspection. Record limits separately from provider live proof.

## Privacy and scope

Owner authentication, no-store, size limits, fixed Google endpoints and calendar allowlist remain mandatory. No credentials or source contents in logs. Consent is user initiated; do not reconnect or invoke live APIs during synthetic tests. No planner, snapshot source, event writes or progress updates.
