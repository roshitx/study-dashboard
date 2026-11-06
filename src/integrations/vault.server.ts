import { requireOwner, type AuthEnv } from './auth.server'

export interface VaultObject { key: string; size: number; customMetadata?: Record<string, string> }
export interface VaultStoredObject { size: number; etag: string; httpEtag: string; body: ReadableStream<Uint8Array>; customMetadata?: Record<string, string> }
export interface VaultBucket {
  list(options: { prefix: string; limit: number; cursor?: string; include?: ('customMetadata')[] }): Promise<{ objects: VaultObject[] } & ({ truncated: true; cursor: string } | { truncated: false })>
  get(key: string): Promise<VaultStoredObject | null>
  put(key: string, value: Uint8Array | ArrayBuffer | ReadableStream, options?: { onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string }; customMetadata?: Record<string, string> }): Promise<{ etag: string; httpEtag: string } | null>
}
export interface VaultEnv extends AuthEnv { VAULT_TEST_BUCKET?: VaultBucket; VAULT_HISTORY_BUCKET?: VaultBucket; VAULT_TEST_WRITES?: string }

const prefix = 'interop/'
const maxBytes = 8 * 1024 * 1024
const validKey = /^(?:[A-Za-z0-9_=-]+\/)*[A-Za-z0-9_=-]+$/
const validCursor = /^[A-Za-z0-9+/=_-]{1,1024}$/
const validRevision = /^"[\x21\x23-\x7e]+"$/
const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const magic = new Uint8Array([82, 67, 76, 79, 78, 69, 0, 0])

function reply(body: object, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers)
  h.set('Content-Type', 'application/json')
  h.set('Cache-Control', 'no-store')
  h.set('Pragma', 'no-cache')
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('Referrer-Policy', 'no-referrer')
  return new Response(JSON.stringify(body), { status, headers: h })
}

async function boundedBytes(stream: ReadableStream<Uint8Array>, size?: number): Promise<Uint8Array | null> {
  if (size !== undefined && size > maxBytes) { await stream.cancel(); return null }
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) { await reader.cancel(); return null }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length }
  return result
}

export async function handleVault(request: Request, env: VaultEnv): Promise<Response> {
  try {
    const owner = await requireOwner(request, env)
    if (owner instanceof Response) return owner
    const url = new URL(request.url)
    const listing = url.pathname === '/api/vault/list'
    const objectRoute = url.pathname === '/api/vault/object'
    const historyRoute = url.pathname === '/api/vault/history'
    if (!listing && !objectRoute && !historyRoute) return reply({ error: 'invalid_input' }, 400)
    const writing = (objectRoute && request.method === 'PUT') || (historyRoute && request.method === 'POST')
    if (request.method !== 'GET' && !writing) return reply({ error: 'invalid_input' }, 405, { Allow: listing ? 'GET' : objectRoute ? 'GET, PUT' : 'GET, POST' })
    const names = listing ? ['cursor'] : historyRoute && writing ? ['key', 'id'] : ['key']
    if ([...url.searchParams.keys()].some(key => !names.includes(key)) || names.some(name => url.searchParams.getAll(name).length > 1 || (name !== 'cursor' && url.searchParams.getAll(name).length !== 1))) return reply({ error: 'invalid_input' }, 400)
    const value = url.searchParams.get(listing ? 'cursor' : 'key') ?? undefined
    if (value !== undefined && (listing ? !validCursor.test(value) : value.length > 1024 || !validKey.test(value))) return reply({ error: 'invalid_input' }, 400)
    const id = url.searchParams.get('id')
    if (id !== null && !validId.test(id)) return reply({ error: 'invalid_input' }, 400)
    if (writing && request.headers.get('Origin') !== url.origin) return reply({ error: 'forbidden' }, 403)
    if (writing && env.VAULT_TEST_WRITES !== 'enabled') return reply({ error: 'not_configured' }, 503)
    const revision = request.headers.get('If-Match')
    if (writing && (!revision || !validRevision.test(revision))) return reply({ error: 'invalid_input' }, 400)
    const bucket = env.VAULT_TEST_BUCKET
    if (!bucket) return reply({ error: 'not_configured' }, 503)
    if (listing) {
      const page = await bucket.list({ prefix, limit: 100, ...(value === undefined ? {} : { cursor: value }) })
      if (page.objects.length > 100 || (page.truncated && !validCursor.test(page.cursor))) return reply({ error: 'provider_error' }, 503)
      const objects = page.objects.map(object => {
        const key = object.key.startsWith(prefix) ? object.key.slice(prefix.length) : ''
        if (key.length > 1024 || !validKey.test(key) || !Number.isSafeInteger(object.size) || object.size < 0) throw new Error('invalid listing')
        return { key, size: object.size }
      })
      return reply({ objects, cursor: page.truncated ? page.cursor : null })
    }
    let historyPrefix = ''
    const history = env.VAULT_HISTORY_BUCKET
    if (historyRoute || writing) {
      if (!history || history === bucket) return reply({ error: 'not_configured' }, 503)
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prefix + value!))
      historyPrefix = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') + '/'
    }
    if (historyRoute && !writing) {
      const page = await history!.list({ prefix: historyPrefix, limit: 100, include: ['customMetadata'] })
      if (page.objects.length > 100 || page.truncated) return reply({ error: 'provider_error' }, 503)
      const items = page.objects.map(item => {
        const itemId = item.key.startsWith(historyPrefix) ? item.key.slice(historyPrefix.length) : ''
        const itemRevision = item.customMetadata?.revision
        if (!validId.test(itemId) || !itemRevision || !validRevision.test(itemRevision)) throw new Error('invalid history')
        return { id: itemId, revision: itemRevision }
      })
      return reply({ items })
    }
    let replacement: Uint8Array | null = null
    if (writing && objectRoute) {
      if (request.headers.get('Content-Type') !== 'application/octet-stream' || !request.body) return reply({ error: 'invalid_input' }, 400)
      replacement = await boundedBytes(request.body)
      if (!replacement) return reply({ error: 'too_large' }, 413)
      if (replacement.length < magic.length || !magic.every((byte, index) => replacement![index] === byte)) return reply({ error: 'invalid_input' }, 400)
    }
    if (writing && historyRoute) {
      const archived = await history!.get(historyPrefix + id!)
      if (!archived) return reply({ error: 'not_found' }, 404)
      if (!Number.isSafeInteger(archived.size) || archived.size < 0) return reply({ error: 'provider_error' }, 503)
      replacement = await boundedBytes(archived.body, archived.size)
      if (!replacement) return reply({ error: 'too_large' }, 413)
      if (replacement.length !== archived.size || replacement.length < magic.length || !magic.every((byte, index) => replacement![index] === byte)) return reply({ error: 'provider_error' }, 503)
    }
    const object = await bucket.get(prefix + value!)
    if (!object) return reply({ error: 'not_found' }, 404)
    if (!Number.isSafeInteger(object.size) || object.size < 0 || !validRevision.test(object.httpEtag) || object.httpEtag !== `"${object.etag}"`) return reply({ error: 'provider_error' }, 503)
    if (!writing) {
      if (object.size > maxBytes) { await object.body.cancel(); return reply({ error: 'too_large' }, 413) }
      return new Response(object.body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(object.size), ETag: object.httpEtag, 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })
    }
    if (revision !== object.httpEtag) { await object.body.cancel(); return reply({ error: 'conflict' }, 409) }
    const oldBytes = await boundedBytes(object.body, object.size)
    if (!oldBytes) return reply({ error: 'too_large' }, 413)
    if (oldBytes.length !== object.size) return reply({ error: 'provider_error' }, 503)
    const backup = await history!.put(historyPrefix + crypto.randomUUID(), oldBytes, { onlyIf: { etagDoesNotMatch: '*' }, customMetadata: { revision: object.httpEtag } })
    if (!backup) return reply({ error: 'provider_error' }, 503)
    try {
      const saved = await bucket.put(prefix + value!, replacement!, { onlyIf: { etagMatches: object.etag } })
      if (!saved) return reply({ error: 'conflict' }, 409)
      if (!validRevision.test(saved.httpEtag) || saved.httpEtag !== `"${saved.etag}"`) return reply({ error: 'uncertain_write' }, 503)
      return reply({ revision: saved.httpEtag })
    } catch { return reply({ error: 'uncertain_write' }, 503) }
  } catch { return reply({ error: 'provider_error' }, 503) }
}
