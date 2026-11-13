import { requireOwner } from './auth.server'
import { parseWriteRequest } from '../domain/tuton-write'
import type { TutonEnv } from './tuton-provider.server'
import type { TutonCoordinator } from './tuton-coordinator.server'
export interface TutonWriteEnv extends TutonEnv { TUTON_WRITER?: DurableObjectNamespace<TutonCoordinator> }
function reply(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } }) }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
export async function handleTutonWrite(request: Request, env: TutonWriteEnv): Promise<Response> {
  const owner = await requireOwner(request, env)
  if (owner instanceof Response) return owner
  try {
    const url = new URL(request.url)
    if (url.origin !== new URL(env.GOOGLE_REDIRECT_URI!).origin) return reply({ error: 'forbidden' }, 403)
    if (!env.TUTON_WRITER || !env.GOOGLE_SHEET_ID) return reply({ error: 'not_configured' }, 503)
    const stub = env.TUTON_WRITER.get(env.TUTON_WRITER.idFromName(env.GOOGLE_SHEET_ID))
    if (request.method === 'GET' && url.pathname === '/api/google/receipt') {
      const operationId = url.searchParams.get('operationId') ?? ''
      if (!uuid.test(operationId) || [...url.searchParams].length !== 1) return reply({ error: 'invalid_input' }, 400)
      const receipt = await stub.receipt(owner.subject, operationId)
      return receipt ? reply(receipt) : reply({ error: 'not_found' }, 404)
    }
    if (request.method !== 'POST' || url.search || !['/api/google/update', '/api/google/reconcile'].includes(url.pathname)) return reply({ error: 'invalid_input' }, 400)
    if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return reply({ error: 'forbidden' }, 403)
    if (request.headers.get('Content-Type')?.split(';')[0]?.trim() !== 'application/json' || request.headers.has('Content-Encoding')) return reply({ error: 'invalid_input' }, 415)
    if (!request.body) return reply({ error: 'invalid_input' }, 400)
    const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0
    try { for (; ;) { const c = await reader.read(); if (c.done) break; size += c.value.byteLength; if (size > 4096) return reply({ error: 'too_large' }, 413); chunks.push(c.value) } } finally { await reader.cancel() }
    const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.byteLength }
    const input: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (url.pathname === '/api/google/update') return reply(await stub.execute(owner.subject, parseWriteRequest(input)))
    if (!input || typeof input !== 'object' || Object.keys(input).length !== 1 || !('operationId' in input) || typeof input.operationId !== 'string' || !uuid.test(input.operationId)) return reply({ error: 'invalid_input' }, 400)
    const receipt = await stub.reconcile(owner.subject, input.operationId)
    return receipt ? reply(receipt) : reply({ error: 'not_found' }, 404)
  } catch (error) { return reply({ error: error instanceof Error && error.message === 'invalid_input' ? 'invalid_input' : 'write_unavailable' }, error instanceof Error && error.message === 'invalid_input' ? 400 : 503) }
}
