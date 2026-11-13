# Tuton safe writes Implementation Plan

**Goal:** issue #21 checkbox/numeric edits with durable serialization, receipts and readback.
**Architecture:** Worker authenticates/validates owner request; per-workbook Durable Object owns receipt and provider mutation. Server selects target from workbook-bound academic metadata, never arbitrary client range. UI explicit confirmation, consent write separate read/login.
**Tech Stack:** existing TanStack Start, React, TypeScript, Cloudflare Workers/Durable Objects/D1, oauth4webapi, Bun.

## Constraints

Approved design: ../specs/2026-11-09-tuton-safe-writes-design.md. No remote provisioning/deploy or live spreadsheet writes. Preserve unrelated changes. Tests synthetic, private data never logged. Keep read-only grant functional. No module-level mutex claim, no external CAS claim.

## Steps

- [ ] Implement workbook-bound mapping + pure edit validation/coordinator core, behavioral tests serial/idempotent/uncertain/readback.
- [ ] Implement Worker entry/DO adapter, authenticated endpoints and write consent using existing OAuth lifecycle. Grant read-only must remain distinguishable from write.
- [ ] Implement tracker editor with offering/session/activity identity, expected value, confirmation and receipt readback UI; no arbitrary coordinates.
- [ ] Integrate contracts, security review, run frozen install/tests/build/typecheck plus actual DO/API and UI synthetic smoke. Fix observed issues.
- [ ] Update docs evidence, preserve live consent/write gate; no commit/push/deploy.

## Internal request contract

POST /api/google/update JSON: { operationId: UUID, offeringId: string, sessionNumber: positive integer, activity: string, expectedValue: boolean|number|null, value: boolean|number|null }. POST /api/google/reconcile JSON: { operationId: UUID }. GET /api/google/receipt?operationId=UUID. All requests owner-scoped/no-store, writes same-origin JSON and bounded. Result {operationId,status: pending|confirmed|rejected|uncertain,code?:string,value?:boolean|number|null}. Provider target server-generated from verified bindings and detected headers. UI must never claim confirmed unless server receipt says confirmed. Update checkbox boolean; Nilai finite numeric/null; no planner/submission inference. Readback mismatch stays uncertain. Retry same operation never dispatches again. Operation ID collision mismatched payload rejected.
