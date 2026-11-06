import { requireOwner, type AuthEnv } from './auth.server'

interface VaultObject { key: string; size: number }
interface VaultBucket {
  list(options: { prefix: string; limit: number; cursor?: string }): Promise<{ objects: VaultObject[] } & ({ truncated: true; cursor: string } | { truncated: false })>
  get(key: string): Promise<{ size: number; body: ReadableStream<Uint8Array> } | null>
}
export interface VaultEnv extends AuthEnv { VAULT_TEST_BUCKET?: VaultBucket }

const prefix = 'interop/'
const maxBytes = 8 * 1024 * 1024
const validKey = /^(?:[A-Za-z0-9_=-]+\/)*[A-Za-z0-9_=-]+$/
const validCursor = /^[A-Za-z0-9+/=_-]{1,1024}$/

function reply(body: object, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers)
  h.set('Content-Type', 'application/json')
  h.set('Cache-Control', 'no-store')
  h.set('Pragma', 'no-cache')
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('Referrer-Policy', 'no-referrer')
  return new Response(JSON.stringify(body), { status, headers: h })
}

export async function handleVault(request: Request, env: VaultEnv): Promise<Response> {
  try {
    const owner = await requireOwner(request, env)
    if (owner instanceof Response) return owner
    const url = new URL(request.url)
    if (url.pathname !== '/api/vault/list' && url.pathname !== '/api/vault/object') return reply({ error: 'invalid_input' }, 400)
    if (request.method !== 'GET') return reply({ error: 'invalid_input' }, 405, { Allow: 'GET' })
    const listing = url.pathname === '/api/vault/list'
    const name = listing ? 'cursor' : 'key'
    const values = url.searchParams.getAll(name)
    if ([...url.searchParams.keys()].some(key => key !== name) || values.length > 1 || (!listing && values.length !== 1)) return reply({ error: 'invalid_input' }, 400)
    const value = values[0]
    if (value !== undefined && (listing ? !validCursor.test(value) : value.length > 1024 || !validKey.test(value))) return reply({ error: 'invalid_input' }, 400)
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
    const object = await bucket.get(prefix + value!)
    if (!object) return reply({ error: 'not_found' }, 404)
    if (!Number.isSafeInteger(object.size) || object.size < 0) return reply({ error: 'provider_error' }, 503)
    if (object.size > maxBytes) { await object.body.cancel(); return reply({ error: 'too_large' }, 413) }
    return new Response(object.body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(object.size), 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })
  } catch { return reply({ error: 'provider_error' }, 503) }
}
