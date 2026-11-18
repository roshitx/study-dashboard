import * as oauth from 'oauth4webapi'

interface Statement {
  bind(...values: (string | number)[]): Statement
  first<T>(): Promise<T | null>
  run(): Promise<unknown>
}
export interface AuthDatabase { prepare(sql: string): Statement }
export interface AuthEnv {
  AUTH_DB?: AuthDatabase
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_REDIRECT_URI?: string
  AUTH_OWNER_EMAIL?: string
}
interface Transaction { state: string; nonce: string; verifier: string; expires_at: number; return_to: string }
interface Session { subject: string; email: string; expires_at: number }
const server: oauth.AuthorizationServer = {
  issuer: 'https://accounts.google.com',
  authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  token_endpoint: 'https://oauth2.googleapis.com/token',
  jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
  id_token_signing_alg_values_supported: ['RS256'],
}
const duration = 8 * 60 * 60
export async function tokenHash(token: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('')
}
function configuration(env: AuthEnv) {
  if (!env.AUTH_DB || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI || !env.AUTH_OWNER_EMAIL) return null
  const callback = new URL(env.GOOGLE_REDIRECT_URI)
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(callback.hostname)
  if ((callback.protocol !== 'https:' && !(loopback && callback.protocol === 'http:')) || callback.username || callback.password || callback.search || callback.hash || callback.pathname !== '/api/auth/google/callback') return null
  return { db: env.AUTH_DB, client: { client_id: env.GOOGLE_CLIENT_ID, id_token_signed_response_alg: 'RS256' } satisfies oauth.Client, secret: env.GOOGLE_CLIENT_SECRET, callback, secure: callback.protocol === 'https:', owner: env.AUTH_OWNER_EMAIL.trim().toLowerCase() }
}
type Config = NonNullable<ReturnType<typeof configuration>>
function cookieName(config: Config, kind: 'session' | 'transaction') { return `${config.secure ? '__Host-' : ''}study-${kind}` }
function cookie(config: Config, kind: 'session' | 'transaction', token: string, age: number) {
  return `${cookieName(config, kind)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${config.secure ? '; Secure' : ''}`
}
function readCookie(request: Request, config: Config, kind: 'session' | 'transaction') {
  const matches = (request.headers.get('Cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(cookieName(config, kind) + '='))
  if (matches.length !== 1) return null
  const token = matches[0]!.slice(cookieName(config, kind).length + 1)
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}
function response(body: object | null, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers)
  h.set('Cache-Control', 'no-store')
  h.set('Pragma', 'no-cache')
  h.set('Referrer-Policy', 'no-referrer')
  h.set('X-Content-Type-Options', 'nosniff')
  if (body) h.set('Content-Type', 'application/json')
  return new Response(body ? JSON.stringify(body) : null, { status, headers: h })
}
type AuthError = 'cancelled' | 'forbidden' | 'invalid_callback' | 'provider_unavailable' | 'not_configured' | 'invalid_input'
function authError(request: Request, error: AuthError, status: number, headers?: HeadersInit) {
  const url = new URL(request.url)
  const document = request.method === 'GET' && (url.pathname === '/api/auth/google/login' || url.pathname === '/api/auth/google/callback') && (request.headers.get('Sec-Fetch-Dest') === 'document' || (request.headers.get('Accept') ?? '').includes('text/html'))
  if (!document) return response({ error: error === 'cancelled' || error === 'provider_unavailable' ? 'invalid_callback' : error }, status, headers)
  const redirectHeaders = new Headers(headers)
  redirectHeaders.set('Location', '/login?error=' + (error === 'invalid_input' ? 'invalid_callback' : error))
  return response(null, 303, redirectHeaders)
}
function safeReturnTo(value: string | null): string {
  if (!value || value === '/') return '/'
  const match = /^\/\?tab=(today|courses|notes|connections)$/.exec(value)
  return match ? '/?tab=' + match[1] : '/'
}
async function ownerSession(request: Request, env: AuthEnv): Promise<Session | Response> {
  try {
    const config = configuration(env)
    if (!config) return response({ error: 'not_configured' }, 503)
    if (new URL(request.url).origin !== config.callback.origin) return response({ error: 'forbidden' }, 403)
    const token = readCookie(request, config, 'session')
    if (!token) return response({ error: 'unauthorized' }, 401)
    const session = await config.db.prepare('SELECT subject, email, expires_at FROM auth_sessions WHERE token_hash = ?').bind(await tokenHash(token)).first<Session>()
    if (!session || session.expires_at <= Math.floor(Date.now() / 1000)) return response({ error: 'unauthorized' }, 401)
    if (session.email !== config.owner) return response({ error: 'forbidden' }, 403)
    return session
  } catch { return response({ error: 'not_configured' }, 503) }
}
export async function requireOwner(request: Request, env: AuthEnv): Promise<{ subject: string } | Response> {
  const session = await ownerSession(request, env)
  return session instanceof Response ? session : { subject: session.subject }
}
export async function handleAuth(request: Request, env: AuthEnv): Promise<Response> {
  let config: Config | null = null
  try {
    config = configuration(env)
    if (!config) return authError(request, 'not_configured', 503)
    const url = new URL(request.url)
    if (url.origin !== config.callback.origin) return authError(request, 'forbidden', 403)
    const now = Math.floor(Date.now() / 1000)
    if (url.pathname === '/api/session' && request.method === 'GET') {
      const owner = await ownerSession(request, env)
      return owner instanceof Response ? owner : response({ authenticated: true, expiresAt: owner.expires_at * 1000 })
    }
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      if (request.headers.get('Origin') !== config.callback.origin) return response({ error: 'forbidden' }, 403)
      if (Number(request.headers.get('Content-Length') ?? 0) > 0) return response({ error: 'invalid_input' }, 400)
      if (request.body) {
        const reader = request.body.getReader()
        try { const chunk = await reader.read(); if (!chunk.done && chunk.value.byteLength > 0) return response({ error: 'invalid_input' }, 400) }
        finally { await reader.cancel(); reader.releaseLock() }
      }
      const token = readCookie(request, config, 'session')
      if (token) await config.db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await tokenHash(token)).run()
      const transaction = readCookie(request, config, 'transaction')
      if (transaction) await config.db.prepare('DELETE FROM auth_transactions WHERE token_hash = ?').bind(await tokenHash(transaction)).run()
      const headers = new Headers()
      headers.append('Set-Cookie', cookie(config, 'session', '', 0))
      headers.append('Set-Cookie', cookie(config, 'transaction', '', 0))
      return response(null, 204, headers)
    }
    if (url.pathname === '/api/auth/google/login' && request.method === 'GET') {
      if ([...url.searchParams.keys()].some(key => key !== 'returnTo') || url.searchParams.getAll('returnTo').length > 1 || request.headers.get('Sec-Fetch-Site') === 'cross-site') return authError(request, 'invalid_input', 400)
      const returnTo = safeReturnTo(url.searchParams.get('returnTo'))
      const token = oauth.generateRandomState()
      const state = oauth.generateRandomState(); const nonce = oauth.generateRandomNonce(); const verifier = oauth.generateRandomCodeVerifier()
      await config.db.prepare('DELETE FROM auth_transactions WHERE expires_at <= ?').bind(now).run()
      await config.db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').bind(now).run()
      const previous = readCookie(request, config, 'transaction')
      if (previous) await config.db.prepare('DELETE FROM auth_transactions WHERE token_hash = ?').bind(await tokenHash(previous)).run()
      await config.db.prepare('INSERT INTO auth_transactions (token_hash, state, nonce, verifier, expires_at, return_to) VALUES (?, ?, ?, ?, ?, ?)').bind(await tokenHash(token), state, nonce, verifier, now + 600, returnTo).run()
      const target = new URL(server.authorization_endpoint!)
      for (const [key, value] of Object.entries({ client_id: config.client.client_id, redirect_uri: config.callback.href, response_type: 'code', scope: 'openid email profile', state, nonce, code_challenge: await oauth.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256' })) target.searchParams.set(key, value)
      return response(null, 302, { Location: target.href, 'Set-Cookie': cookie(config, 'transaction', token, 600) })
    }
    if (url.pathname === '/api/auth/google/callback' && request.method === 'GET') {
      const headers = new Headers({ 'Set-Cookie': cookie(config, 'transaction', '', 0) })
      if (url.href.length > 8192) return authError(request, 'invalid_callback', 400, headers)
      const token = readCookie(request, config, 'transaction')
      if (!token) return authError(request, 'invalid_callback', 400, headers)
      const transaction = await config.db.prepare('DELETE FROM auth_transactions WHERE token_hash = ? RETURNING state, nonce, verifier, expires_at, return_to').bind(await tokenHash(token)).first<Transaction>()
      if (!transaction || transaction.expires_at <= now) return authError(request, 'invalid_callback', 400, headers)
      if (url.searchParams.getAll('state').length !== 1 || url.searchParams.get('state') !== transaction.state) return authError(request, 'invalid_callback', 400, headers)
      if (url.searchParams.has('error')) {
        if (url.searchParams.getAll('error').length !== 1 || url.searchParams.has('code')) return authError(request, 'invalid_callback', 400, headers)
        if (url.searchParams.get('error') === 'access_denied') return authError(request, 'cancelled', 400, headers)
        return authError(request, 'provider_unavailable', 400, headers)
      }
      let params: URLSearchParams
      try { params = oauth.validateAuthResponse(server, config.client, url, transaction.state) }
      catch { return authError(request, 'invalid_callback', 400, headers) }
      try {
        const tokens = await oauth.authorizationCodeGrantRequest(server, config.client, oauth.ClientSecretPost(config.secret), params, config.callback.href, transaction.verifier, { signal: AbortSignal.timeout(15000) })
        const result = await oauth.processAuthorizationCodeResponse(server, config.client, tokens, { expectedNonce: transaction.nonce, requireIdToken: true })
        await oauth.validateApplicationLevelSignature(server, tokens, { signal: AbortSignal.timeout(15000) })
        const claims = oauth.getValidatedIdTokenClaims(result)!
        if (claims.email_verified !== true || typeof claims.email !== 'string' || claims.email.toLowerCase() !== config.owner) return authError(request, 'forbidden', 403, headers)
        const session = oauth.generateRandomState()
        const previous = readCookie(request, config, 'session')
        if (previous) await config.db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await tokenHash(previous)).run()
        await config.db.prepare('INSERT INTO auth_sessions (token_hash, subject, email, expires_at) VALUES (?, ?, ?, ?)').bind(await tokenHash(session), claims.sub, config.owner, now + duration).run()
        headers.append('Set-Cookie', cookie(config, 'session', session, duration))
        headers.set('Location', config.callback.origin + safeReturnTo(transaction.return_to))
        return response(null, 303, headers)
      } catch { return authError(request, 'provider_unavailable', 400, headers) }
    }
    return response({ error: 'invalid_input' }, 405, { Allow: url.pathname === '/api/auth/logout' ? 'POST' : 'GET' })
  } catch { return authError(request, 'not_configured', 503) }
}
