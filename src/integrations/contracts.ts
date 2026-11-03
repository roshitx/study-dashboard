import type { IntegrationResult } from '../domain/model.ts'

// No concrete transport in this scaffold. Do not return fake success from these ports.
export interface CiphertextObject { key: string; bytes: Uint8Array; revision: string }
export interface VaultTransport {
  read(key: string): Promise<IntegrationResult<CiphertextObject>>
  write(input: { key: string; ciphertext: Uint8Array; expectedRevision: string; idempotencyKey: string }): Promise<IntegrationResult<{ revision: string }>>
}
// Implement only in browser, with an audited compatible library and actual plugin fixtures.
export interface VaultCrypto {
  unlock(password: string): Promise<void>
  decrypt(input: CiphertextObject): Promise<{ path: string; bytes: Uint8Array }>
  encrypt(path: string, plaintext: Uint8Array): Promise<{ key: string; ciphertext: Uint8Array }>
  lock(): void
}
export interface SheetsPort {
  inspectHeaders(spreadsheetId: string, sheetId: number): Promise<IntegrationResult<unknown>>
  // Server resolves allowlisted A1 from stable activity mapping; client cannot select arbitrary cells.
  updateActivity(input: { activityId: string; value: boolean | number | null; expectedValue: unknown; idempotencyKey: string }): Promise<IntegrationResult<unknown>>
}
export interface CalendarPort {
  list(input: { start: string; end: string }): Promise<IntegrationResult<unknown[]>>
  upsertStudyBlock(input: { studySessionId: string; expectedRevision: string | null; idempotencyKey: string }): Promise<IntegrationResult<{ eventId: string }>>
}
export const integrationStates = { vault: 'not_configured', sheets: 'not_configured', calendar: 'not_configured', ai: 'not_configured' } as const
