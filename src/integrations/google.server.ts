import * as oauth from 'oauth4webapi'
import { requireOwner, tokenHash, type AuthEnv } from './auth.server'

export interface GoogleEnv extends AuthEnv { GOOGLE_TOKEN_KEY?: string; GOOGLE_SHEET_ID?: string }
type Service = 'sheets' | 'calendar' | 'sheetsWrite'
const scopes = {
  sheets: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  calendar: ['https://www.googleapis.com/auth/calendar.calendarlist.readonly'],
  sheetsWrite: ['https://www.googleapis.com/auth/spreadsheets'],
}
const server: oauth.AuthorizationServer = { issuer: 'https://accounts.google.com', authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth', token_endpoint: 'https://oauth2.googleapis.com/token', jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs', id_token_signing_alg_values_supported: ['RS256'] }
function reply(body: unknown, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers); h.set('Cache-Control', 'no-store'); h.set('Referrer-Policy', 'no-referrer'); h.set('X-Content-Type-Options', 'nosniff')
  if (body !== null) h.set('Content-Type', 'application/json')
  return new Response(body === null ? null : JSON.stringify(body), { status, headers: h })
}
async function key(env: GoogleEnv) {
  if (!env.GOOGLE_TOKEN_KEY || !/^[a-f0-9]{64}$/.test(env.GOOGLE_TOKEN_KEY)) throw new Error('not_configured')
  return crypto.subtle.importKey('raw', Uint8Array.from(env.GOOGLE_TOKEN_KEY.match(/../g)!, v => parseInt(v, 16)), 'AES-GCM', false, ['encrypt', 'decrypt'])
}
export async function protectGoogleToken(env: GoogleEnv, subject: string, service: Service, token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`${subject}:${service}`) }, await key(env), new TextEncoder().encode(token)))
  return btoa(String.fromCharCode(...iv, ...encrypted))
}
async function readGoogleToken(env: GoogleEnv, subject: string, service: Service, encrypted: string) {
  const bytes = Uint8Array.from(atob(encrypted), v => v.charCodeAt(0))
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(`${subject}:${service}`) }, await key(env), bytes.slice(12)))
}
async function providerJSON(url: URL, accessToken: string): Promise<Record<string, unknown>> {
  let response: Response
  try { response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000), redirect: 'error' }) }
  catch (error) {
    if (error instanceof TypeError || error instanceof DOMException) throw new Error('provider_unavailable')
    throw new Error('provider_error')
  }
  if (!response.ok) throw new Error(response.status === 429 ? 'rate_limited' : response.status === 401 ? 'access_token_rejected' : response.status === 403 ? 'provider_access_denied' : 'provider_error')
  const reader = response.body!.getReader(); const chunks: Uint8Array[] = []; let length = 0
  try { for (; ;) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 2097152) throw new Error('source_too_large'); chunks.push(value) } } finally { await reader.cancel() }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('provider_error')
  return parsed as Record<string, unknown>
}
export async function handleGoogle(request: Request, env: GoogleEnv): Promise<Response> {
  const owner = await requireOwner(request, env)
  if (owner instanceof Response) return owner
  try {
    const url = new URL(request.url), origin = new URL(env.GOOGLE_REDIRECT_URI!).origin
    if (url.origin !== origin) return reply({ error: 'forbidden' }, 403)
    const secure = url.protocol === 'https:', cookieName = `${secure ? '__Host-' : ''}study-google`
    const cookie = (token: string, seconds: number) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure ? '; Secure' : ''}`
    const callback = origin + '/api/google/callback'
    const client: oauth.Client = { client_id: env.GOOGLE_CLIENT_ID!, id_token_signed_response_alg: 'RS256' }
    const now = Math.floor(Date.now() / 1000)
    if (url.pathname === '/api/google/status' && request.method === 'GET' && !url.search) {
      const connected: Record<string, boolean> = {}
      for (const service of ['sheets', 'calendar', 'sheetsWrite']) connected[service] = !!await env.AUTH_DB!.prepare('SELECT subject FROM google_grants WHERE subject = ? AND service = ?').bind(owner.subject, service).first()
      return reply({ connected, configured: !!env.GOOGLE_TOKEN_KEY, sheetConfigured: !!env.GOOGLE_SHEET_ID })
    }
    if (url.pathname === '/api/google/callback' && request.method === 'GET') {
      const headers = new Headers({ 'Set-Cookie': cookie('', 0) })
      if (url.href.length > 8192) return reply({ error: 'invalid_callback' }, 400, headers)
      const cookies = (request.headers.get('Cookie') ?? '').split(';').map(v => v.trim()).filter(v => v.startsWith(cookieName + '='))
      const token = cookies.length === 1 ? cookies[0].slice(cookieName.length + 1) : ''
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return reply({ error: 'invalid_callback' }, 400, headers)
      const transaction = await env.AUTH_DB!.prepare('DELETE FROM google_transactions WHERE token_hash = ? AND subject = ? RETURNING service, state, nonce, verifier, expires_at').bind(await tokenHash(token), owner.subject).first<{ service: Service; state: string; nonce: string; verifier: string; expires_at: number }>()
      if (!transaction || transaction.expires_at <= now) return reply({ error: 'invalid_callback' }, 400, headers)
      try {
        const params = oauth.validateAuthResponse(server, client, url, transaction.state)
        const response = await oauth.authorizationCodeGrantRequest(server, client, oauth.ClientSecretPost(env.GOOGLE_CLIENT_SECRET!), params, callback, transaction.verifier, { signal: AbortSignal.timeout(15000) })
        const tokens = await oauth.processAuthorizationCodeResponse(server, client, response, { expectedNonce: transaction.nonce, requireIdToken: true })
        await oauth.validateApplicationLevelSignature(server, response, { signal: AbortSignal.timeout(15000) })
        const claims = oauth.getValidatedIdTokenClaims(tokens)!
        if (claims.sub !== owner.subject || claims.email_verified !== true || claims.email !== env.AUTH_OWNER_EMAIL?.trim().toLowerCase()) return reply({ error: 'forbidden' }, 403, headers)
        const granted = new Set((tokens.scope ?? '').split(' '))
        if (!scopes[transaction.service].every(scope => granted.has(scope)) || !tokens.refresh_token) return reply({ error: 'consent_incomplete' }, 400, headers)
        const encrypted = await protectGoogleToken(env, owner.subject, transaction.service, tokens.refresh_token)
        await env.AUTH_DB!.prepare('INSERT INTO google_grants(subject, service, encrypted_token) VALUES (?, ?, ?) ON CONFLICT(subject, service) DO UPDATE SET encrypted_token = excluded.encrypted_token').bind(owner.subject, transaction.service, encrypted).run()
        headers.set('Location', origin + '/?tab=connections'); return reply(null, 303, headers)
      } catch { return reply({ error: 'invalid_callback' }, 400, headers) }
    }
    const service = url.searchParams.get('service')
    if (service !== 'sheets' && service !== 'calendar' && service !== 'sheetsWrite') return reply({ error: 'invalid_input' }, 400)
    if ([...url.searchParams.keys()].some(k => k !== 'service') || url.searchParams.getAll('service').length !== 1) return reply({ error: 'invalid_input' }, 400)
    if (request.method === 'POST') {
      if (request.headers.get('Origin') !== origin) return reply({ error: 'forbidden' }, 403)
      if (request.body) {
        const reader = request.body.getReader()
        try { const chunk = await reader.read(); if (!chunk.done && chunk.value.byteLength) return reply({ error: 'invalid_input' }, 400) }
        finally { await reader.cancel(); reader.releaseLock() }
      }
      if (url.pathname === '/api/google/disconnect') {
        const grant = await env.AUTH_DB!.prepare('SELECT encrypted_token FROM google_grants WHERE subject = ? AND service = ?').bind(owner.subject, service).first<{ encrypted_token: string }>()
        if (grant) {
          const token = await readGoogleToken(env, owner.subject, service, grant.encrypted_token)
          const revoked = await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }), signal: AbortSignal.timeout(15000), redirect: 'error' })
          if (!revoked.ok && revoked.status !== 400) return reply({ error: 'revocation_unconfirmed' }, 502)
          // Google revocation can invalidate other grants for the same application.
          await env.AUTH_DB!.prepare('DELETE FROM google_grants WHERE subject = ?').bind(owner.subject).run()
        }
        return reply(null, 204)
      }
      if (url.pathname !== '/api/google/connect') return reply({ error: 'invalid_input' }, 405)
      await key(env)
      const token = oauth.generateRandomState(), state = oauth.generateRandomState(), nonce = oauth.generateRandomNonce(), verifier = oauth.generateRandomCodeVerifier()
      await env.AUTH_DB!.prepare('DELETE FROM google_transactions WHERE subject = ? OR expires_at <= ?').bind(owner.subject, now).run()
      await env.AUTH_DB!.prepare('INSERT INTO google_transactions VALUES (?, ?, ?, ?, ?, ?, ?)').bind(await tokenHash(token), owner.subject, service, state, nonce, verifier, now + 600).run()
      const target = new URL(server.authorization_endpoint!)
      for (const [k, v] of Object.entries({ client_id: client.client_id, redirect_uri: callback, response_type: 'code', scope: ['openid', 'email', ...scopes[service]].join(' '), state, nonce, code_challenge: await oauth.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256', access_type: 'offline', prompt: 'consent' })) target.searchParams.set(k, v)
      return reply({ authorizationUrl: target.href }, 200, { 'Set-Cookie': cookie(token, 600) })
    }
    if (request.method !== 'GET' || url.pathname !== '/api/google/read') return reply({ error: 'invalid_input' }, 405)
    if (service === 'sheetsWrite') return reply({ error: 'invalid_input' }, 400)
    if (!await env.AUTH_DB!.prepare('SELECT subject FROM google_grants WHERE subject = ? AND service = ?').bind(owner.subject, service).first()) return reply({ error: 'disconnected' }, 409)
    if (service === 'sheets' && (!env.GOOGLE_SHEET_ID || !/^[A-Za-z0-9_-]{10,200}$/.test(env.GOOGLE_SHEET_ID))) return reply({ error: 'sheet_not_configured' }, 503)
    const accessToken = await googleAccessToken(env, owner.subject, service)
    if (service === 'calendar') {
      const target = new URL('https://www.googleapis.com/calendar/v3/users/me/calendarList'); target.searchParams.set('maxResults', '250')
      const result = await providerJSON(target, accessToken)
      if (result.nextPageToken) return reply({ error: 'source_too_large' }, 422)
      if (!Array.isArray(result.items)) throw new Error('provider_error')
      const calendars = result.items.map((value: unknown) => {
        if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string' || !('summary' in value) || typeof value.summary !== 'string' || !('accessRole' in value) || typeof value.accessRole !== 'string') throw new Error('provider_error')
        return { id: value.id, name: value.summary, accessRole: value.accessRole, timeZone: 'timeZone' in value && typeof value.timeZone === 'string' ? value.timeZone : null }
      })
      return reply({ source: 'live', fetchedAt: new Date().toISOString(), calendars })
    }
    const target = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}`)
    target.searchParams.set('includeGridData', 'true')
    target.searchParams.set('fields', 'spreadsheetId,properties(title,locale,timeZone),sheets(properties(sheetId,title,sheetType,gridProperties),merges,data(startRow,startColumn,rowData(values(userEnteredValue,effectiveValue,formattedValue,dataValidation,note))))')
    const result = await providerJSON(target, accessToken)
    return reply({ source: 'live', fetchedAt: new Date().toISOString(), spreadsheet: result })
  } catch (error) {
    const known = ['not_configured', 'rate_limited', 'reconnect_required', 'provider_error', 'source_too_large', 'oauth_client_error', 'provider_unavailable', 'refresh_unavailable', 'token_unreadable', 'access_token_rejected', 'provider_access_denied']
    const code = error instanceof Error && known.includes(error.message) ? error.message : 'provider_error'
    return reply({ error: code }, code === 'not_configured' ? 503 : 502)
  }
}

export async function googleAccessToken(env: GoogleEnv, subject: string, service: Service): Promise<string> {
  const grant = await env.AUTH_DB!.prepare('SELECT encrypted_token FROM google_grants WHERE subject = ? AND service = ?').bind(subject, service).first<{ encrypted_token: string }>()
  if (!grant) throw new Error('reconnect_required')
  let refreshToken: string
  try { refreshToken = await readGoogleToken(env, subject, service, grant.encrypted_token) } catch { throw new Error('token_unreadable') }
  const client: oauth.Client = { client_id: env.GOOGLE_CLIENT_ID!, id_token_signed_response_alg: 'RS256' }
  let tokens: oauth.TokenEndpointResponse
  try {
    const response = await oauth.refreshTokenGrantRequest(server, client, oauth.ClientSecretPost(env.GOOGLE_CLIENT_SECRET!), refreshToken, { signal: AbortSignal.timeout(15000) })
    tokens = await oauth.processRefreshTokenResponse(server, client, response)
  } catch (error) {
    if (error instanceof oauth.ResponseBodyError) throw new Error(error.error === 'invalid_grant' ? 'reconnect_required' : error.error === 'invalid_client' ? 'oauth_client_error' : error.status === 429 ? 'rate_limited' : 'provider_error')
    if (error instanceof oauth.WWWAuthenticateChallengeError) throw new Error('oauth_client_error')
    if (error instanceof TypeError || error instanceof DOMException) throw new Error('refresh_unavailable')
    throw new Error('provider_error')
  }
  if (service === 'sheetsWrite' && tokens.scope !== undefined && !tokens.scope.split(' ').includes(scopes.sheetsWrite[0])) throw new Error('reconnect_required')
  if (tokens.refresh_token && tokens.refresh_token !== refreshToken) await env.AUTH_DB!.prepare('UPDATE google_grants SET encrypted_token = ? WHERE subject = ? AND service = ? AND encrypted_token = ?').bind(await protectGoogleToken(env, subject, service, tokens.refresh_token), subject, service, grant.encrypted_token).run()
  return tokens.access_token
}
