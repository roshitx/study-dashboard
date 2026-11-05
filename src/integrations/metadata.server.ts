import { parseAcademicMetadata } from '../domain/metadata'
import { requireOwner, type AuthEnv } from './auth.server'

interface MetadataStatement {
  bind(...values: (string | number)[]): MetadataStatement
  first<T>(): Promise<T | null>
}
export interface MetadataEnv extends AuthEnv { METADATA_DB?: { prepare(sql: string): MetadataStatement } }
const maxBytes = 128 * 1024

function reply(body: object, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers)
  h.set('Content-Type', 'application/json')
  h.set('Cache-Control', 'no-store')
  h.set('Pragma', 'no-cache')
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('Referrer-Policy', 'no-referrer')
  return new Response(JSON.stringify(body), { status, headers: h })
}

export async function handleMetadata(request: Request, env: MetadataEnv): Promise<Response> {
  try {
    const owner = await requireOwner(request, env)
    if (owner instanceof Response) return owner
    if (!env.METADATA_DB) return reply({ error: 'not_configured' }, 503)
    const url = new URL(request.url)
    if (url.pathname !== '/api/metadata' || url.search) return reply({ error: 'invalid_input' }, 400)
    if (request.method === 'GET') {
      const row = await env.METADATA_DB.prepare('SELECT revision, config_json FROM academic_metadata WHERE owner_id = ?').bind(owner.subject).first<{ revision: number; config_json: string }>()
      return reply(row ? { revision: row.revision, metadata: JSON.parse(row.config_json) } : { revision: 0, metadata: { semesters: [], courses: [], offerings: [] } })
    }
    if (request.method !== 'PUT') return reply({ error: 'invalid_input' }, 405, { Allow: 'GET, PUT' })
    if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return reply({ error: 'forbidden' }, 403)
    if (request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json' || request.headers.has('Content-Encoding')) return reply({ error: 'invalid_input' }, 415)
    const declared = request.headers.get('Content-Length')
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) return reply({ error: 'invalid_input' }, 413)
    if (!request.body) return reply({ error: 'invalid_input' }, 400)
    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []; let size = 0
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > maxBytes) return reply({ error: 'invalid_input' }, 413)
        chunks.push(chunk.value)
      }
    } finally { await reader.cancel(); reader.releaseLock() }
    let input: { expectedRevision: number; metadata: unknown }
    try {
      const bytes = new Uint8Array(size); let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 2 || !Object.hasOwn(value, 'metadata') || !Number.isSafeInteger(value.expectedRevision) || value.expectedRevision < 0 || value.expectedRevision >= Number.MAX_SAFE_INTEGER) throw new Error('invalid_input')
      input = { expectedRevision: value.expectedRevision, metadata: parseAcademicMetadata(value.metadata) }
    } catch { return reply({ error: 'invalid_input' }, 400) }
    const updated = await env.METADATA_DB.prepare(`INSERT INTO academic_metadata (owner_id, revision, config_json, updated_at)
      SELECT ?, 1, ?, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM academic_metadata WHERE owner_id = ? AND revision = ?)
      ON CONFLICT(owner_id) DO UPDATE SET revision = academic_metadata.revision + 1, config_json = excluded.config_json, updated_at = excluded.updated_at
      WHERE academic_metadata.revision = ? RETURNING revision`).bind(owner.subject, JSON.stringify(input.metadata), new Date().toISOString(), input.expectedRevision, owner.subject, input.expectedRevision, input.expectedRevision).first<{ revision: number }>()
    return updated ? reply({ revision: updated.revision }) : reply({ error: 'conflict' }, 409)
  } catch { return reply({ error: 'provider_error' }, 503) }
}
