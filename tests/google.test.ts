import { test, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import { tokenHash, type AuthDatabase } from '../src/integrations/auth.server'
import { handleGoogle, protectGoogleToken, type GoogleEnv } from '../src/integrations/google.server'

async function setup() {
  const sqlite = new Database(':memory:')
  for (const name of ['0001_sessions.sql', '0002_google_grants.sql', '0003_sheets_write_grant.sql']) sqlite.exec(await Bun.file(new URL('../migrations-auth/' + name, import.meta.url)).text())
  const db: AuthDatabase = { prepare(sql) { let values: (string | number)[] = []; const statement = { bind(...input: (string | number)[]) { values = input; return statement }, async first<T>() { return sqlite.query(sql).get(...values) as T | null }, async run() { return sqlite.query(sql).run(...values) } }; return statement } }
  const env: GoogleEnv = { AUTH_DB: db, GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_REDIRECT_URI: 'https://study.example/api/auth/google/callback', AUTH_OWNER_EMAIL: 'owner@example.test', GOOGLE_TOKEN_KEY: 'ab'.repeat(32) }
  const token = 'a'.repeat(43)
  sqlite.query('INSERT INTO auth_sessions VALUES(?,?,?,?)').run(await tokenHash(token), 'owner-subject', 'owner@example.test', Math.floor(Date.now() / 1000) + 600)
  const request = (path: string, method = 'GET', origin = 'https://study.example', extra: Record<string, string> = {}) => new Request('https://study.example/api/google/' + path, { method, headers: { Cookie: '__Host-study-session=' + token, Origin: origin, ...extra } })
  return { sqlite, env, request }
}
test('Google grants require owner and Origin; service grants remain separate from login', async () => {
  const { sqlite, env, request } = await setup()
  try {
    expect((await handleGoogle(new Request('https://study.example/api/google/status'), env)).status).toBe(401)
    expect((await handleGoogle(request('connect?service=sheets', 'POST', 'https://evil.example'), env)).status).toBe(403)
    expect((await handleGoogle(request('connect?service=drive', 'POST'), env)).status).toBe(400)
    expect((await handleGoogle(request('connect?service=sheets&service=calendar', 'POST'), env)).status).toBe(400)
    const response = await handleGoogle(request('connect?service=sheets', 'POST'), env)
    expect(response.status).toBe(200)
    const { authorizationUrl } = await response.json() as { authorizationUrl: string }
    const target = new URL(authorizationUrl)
    expect(target.searchParams.get('scope')).toBe('openid email https://www.googleapis.com/auth/spreadsheets.readonly')
    expect(target.searchParams.get('redirect_uri')).toBe('https://study.example/api/google/callback')
    expect(target.searchParams.get('access_type')).toBe('offline')
    expect(target.searchParams.get('code_challenge_method')).toBe('S256')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const cookie = response.headers.get('Set-Cookie')!.split(';')[0]!
    const callback = request('callback?state=wrong&code=synthetic', 'GET', 'https://study.example', { Cookie: '__Host-study-session=' + 'a'.repeat(43) + '; ' + cookie })
    expect((await handleGoogle(callback, env)).status).toBe(400)
    expect(sqlite.query('SELECT count(*) AS n FROM google_transactions').get()).toEqual({ n: 0 })
    expect((await handleGoogle(callback, env)).status).toBe(400)
    expect((await handleGoogle(request('read?service=sheets'), env)).status).toBe(409)
  } finally { sqlite.close() }
})
test('refresh tokens are encrypted and bound to owner/service; wrong key fails closed', async () => {
  const { sqlite, env, request } = await setup()
  env.GOOGLE_SHEET_ID = 'synthetic-workbook'
  try {
    const cipher = await protectGoogleToken(env, 'owner-subject', 'sheets', 'private-refresh-token')
    expect(cipher).not.toContain('private-refresh-token')
    const bytes = Uint8Array.from(atob(cipher), c => c.charCodeAt(0))
    const key = await crypto.subtle.importKey('raw', new Uint8Array(32).fill(0xab), 'AES-GCM', false, ['decrypt'])
    expect(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode('owner-subject:sheets') }, key, bytes.slice(12)))).toBe('private-refresh-token')
    await expect(crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode('other:sheets') }, key, bytes.slice(12))).rejects.toThrow()
    sqlite.query('INSERT INTO google_grants VALUES(?,?,?)').run('owner-subject', 'sheets', cipher)
    const response = await handleGoogle(request('read?service=sheets'), { ...env, GOOGLE_TOKEN_KEY: 'cd'.repeat(32) })
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('private-refresh-token')
    const writeConsent = await handleGoogle(request('connect?service=sheetsWrite', 'POST'), env)
    const consent: { authorizationUrl: string } = await writeConsent.json()
    expect(new URL(consent.authorizationUrl).searchParams.get('scope')).toBe('openid email https://www.googleapis.com/auth/spreadsheets')
    expect((await handleGoogle(request('read?service=sheetsWrite'), env)).status).toBe(400)
  } finally { sqlite.close() }
})

test('read distinguishes API rejection from refresh and transport failure', async () => {
  const { sqlite, env, request } = await setup()
  const original = globalThis.fetch
  env.GOOGLE_SHEET_ID = 'synthetic-workbook'
  try {
    const encrypted = await protectGoogleToken(env, 'owner-subject', 'sheets', 'synthetic-refresh')
    sqlite.query('INSERT INTO google_grants VALUES(?,?,?)').run('owner-subject', 'sheets', encrypted)
    for (const [status, expected] of [[401, 'access_token_rejected'], [403, 'provider_access_denied'], [429, 'rate_limited'], [0, 'provider_unavailable']] as const) {
      globalThis.fetch = Object.assign(async (input: string | URL | Request) => {
        if (String(input).includes('oauth2.googleapis.com')) return Response.json({ access_token: 'synthetic-access', token_type: 'Bearer', expires_in: 3600 })
        if (status === 0) throw new TypeError('private-transport-detail')
        return Response.json({ private: 'provider-detail' }, { status })
      }, { preconnect: original.preconnect })
      const response = await handleGoogle(request('read?service=sheets'), env)
      expect(response.status).toBe(502)
      expect(await response.json()).toEqual({ error: expected })
    }
    globalThis.fetch = Object.assign(async () => { throw new TypeError('private-refresh-detail') }, { preconnect: original.preconnect })
    const refreshFailure = await handleGoogle(request('read?service=sheets'), env)
    expect(refreshFailure.status).toBe(502)
    expect(await refreshFailure.json()).toEqual({ error: 'refresh_unavailable' })
  } finally { globalThis.fetch = original; sqlite.close() }
})

test('invalid workbook configuration fails before contacting Google', async () => {
  const { sqlite, env, request } = await setup()
  const original = globalThis.fetch
  let contacted = false
  try {
    const encrypted = await protectGoogleToken(env, 'owner-subject', 'sheets', 'synthetic-refresh')
    sqlite.query('INSERT INTO google_grants VALUES(?,?,?)').run('owner-subject', 'sheets', encrypted)
    globalThis.fetch = Object.assign(async () => { contacted = true; throw new TypeError('synthetic-network-unavailable') }, { preconnect: original.preconnect })
    for (const id of [undefined, '', 'bad/id']) {
      env.GOOGLE_SHEET_ID = id
      const response = await handleGoogle(request('read?service=sheets'), env)
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ error: 'sheet_not_configured' })
      expect(contacted).toBe(false)
    }
  } finally { globalThis.fetch = original; sqlite.close() }
})

test('Calendar reads do not require a configured workbook', async () => {
  const { sqlite, env, request } = await setup()
  const original = globalThis.fetch
  try {
    const encrypted = await protectGoogleToken(env, 'owner-subject', 'calendar', 'synthetic-refresh')
    sqlite.query('INSERT INTO google_grants VALUES(?,?,?)').run('owner-subject', 'calendar', encrypted)
    globalThis.fetch = Object.assign(async (input: string | URL | Request) => String(input).includes('oauth2.googleapis.com')
      ? Response.json({ access_token: 'synthetic-access', token_type: 'Bearer', expires_in: 3600 })
      : Response.json({ items: [{ id: 'synthetic-calendar', summary: 'Belajar', accessRole: 'owner', timeZone: 'Asia/Jakarta' }] }), { preconnect: original.preconnect })
    const response = await handleGoogle(request('read?service=calendar'), env)
    expect(response.status).toBe(200)
    const result = await response.json() as { calendars: unknown }
    expect(result.calendars).toEqual([{ id: 'synthetic-calendar', name: 'Belajar', accessRole: 'owner', timeZone: 'Asia/Jakarta' }])
  } finally { globalThis.fetch = original; sqlite.close() }
})
