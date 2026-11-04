import { test, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import { handleAuth, requireOwner, tokenHash, type AuthDatabase, type AuthEnv } from '../src/integrations/auth.server'

async function setup() {
  const sqlite = new Database(':memory:')
  sqlite.exec(await Bun.file(new URL('../migrations-auth/0001_sessions.sql', import.meta.url)).text())
  const db: AuthDatabase = {
    prepare(sql) {
      let values: (string | number)[] = []
      const statement = { bind(...input: (string | number)[]) { values = input; return statement }, async first<T>() { return sqlite.query(sql).get(...values) as T | null }, async run() { return sqlite.query(sql).run(...values) } }
      return statement
    }
  }
  const env: AuthEnv = { AUTH_DB: db, GOOGLE_CLIENT_ID: 'synthetic-client', GOOGLE_CLIENT_SECRET: 'synthetic-secret', GOOGLE_REDIRECT_URI: 'https://study.example/api/auth/google/callback', AUTH_OWNER_EMAIL: 'owner@example.test' }
  return { sqlite, env }
}
const request = (path: string, init?: RequestInit) => new Request('https://study.example' + path, init)

test('sessions enforce owner, expiry, hashing and same-origin revocation', async () => {
  const { sqlite, env } = await setup()
  try {
    expect((await handleAuth(request('/api/session'), {})).status).toBe(503)
    expect((await handleAuth(request('/api/session'), env)).status).toBe(401)
    const token = 'a'.repeat(43)
    const hash = await tokenHash(token)
    sqlite.query('INSERT INTO auth_sessions VALUES (?, ?, ?, ?)').run(hash, 'subject', 'foreign@example.test', Math.floor(Date.now() / 1000) + 600)
    const headers = { Cookie: '__Host-study-session=' + token }
    expect((await handleAuth(request('/api/session', { headers }), env)).status).toBe(403)
    sqlite.query('UPDATE auth_sessions SET email = ?').run('owner@example.test')
    const authenticated = await handleAuth(request('/api/session', { headers }), env)
    expect(authenticated.status).toBe(200)
    expect(await authenticated.json()).toEqual({ authenticated: true })
    expect(authenticated.headers.get('Cache-Control')).toBe('no-store')
    expect(await requireOwner(request('/api/session', { headers }), env)).toEqual({ subject: 'subject' })
    expect((await handleAuth(request('/api/auth/logout', { method: 'POST', headers: { ...headers, Origin: 'https://foreign.example' } }), env)).status).toBe(403)
    expect((await handleAuth(request('/api/session', { headers }), env)).status).toBe(200)
    const logout = await handleAuth(request('/api/auth/logout', { method: 'POST', headers: { ...headers, Origin: 'https://study.example' } }), env)
    expect(logout.status).toBe(204)
    expect(logout.headers.get('Set-Cookie')).toContain('Max-Age=0')
    expect((await handleAuth(request('/api/session', { headers }), env)).status).toBe(401)
    sqlite.query('INSERT INTO auth_sessions VALUES (?, ?, ?, ?)').run(hash, 'subject', 'owner@example.test', Math.floor(Date.now() / 1000) - 1)
    expect((await handleAuth(request('/api/session', { headers }), env)).status).toBe(401)
  } finally { sqlite.close() }
})

test('OAuth redirect binds PKCE/nonce/state to one browser and consumes callbacks once', async () => {
  const { sqlite, env } = await setup()
  try {
    const login = await handleAuth(request('/api/auth/google/login'), env)
    expect(login.status).toBe(302)
    const target = new URL(login.headers.get('Location')!)
    expect(target.origin).toBe('https://accounts.google.com')
    expect(target.searchParams.get('scope')).toBe('openid email profile')
    expect(target.searchParams.get('code_challenge_method')).toBe('S256')
    expect(target.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const rawCookie = login.headers.get('Set-Cookie')!
    expect(rawCookie).toContain('HttpOnly; SameSite=Lax')
    expect(rawCookie).toContain('Secure')
    const cookie = rawCookie.split(';')[0]!
    const browserToken = cookie.split('=')[1]!
    expect(sqlite.query('SELECT token_hash FROM auth_transactions').get()).toEqual({ token_hash: await tokenHash(browserToken) })
    const callback = '/api/auth/google/callback?code=synthetic&state=' + target.searchParams.get('state')
    expect((await handleAuth(request(callback), env)).status).toBe(400)
    expect(sqlite.query('SELECT count(*) AS count FROM auth_transactions').get()).toEqual({ count: 1 })
    expect((await handleAuth(request('/api/auth/google/callback?code=synthetic&state=wrong', { headers: { Cookie: cookie } }), env)).status).toBe(400)
    expect(sqlite.query('SELECT count(*) AS count FROM auth_transactions').get()).toEqual({ count: 0 })
    expect((await handleAuth(request(callback, { headers: { Cookie: cookie } }), env)).status).toBe(400)
    expect(sqlite.query('SELECT count(*) AS count FROM auth_sessions').get()).toEqual({ count: 0 })
    const expiredLogin = await handleAuth(request('/api/auth/google/login'), env)
    sqlite.query('UPDATE auth_transactions SET expires_at = 0').run()
    expect((await handleAuth(request(callback, { headers: { Cookie: expiredLogin.headers.get('Set-Cookie')!.split(';')[0]! } }), env)).status).toBe(400)
    expect((await handleAuth(request('/api/auth/google/login?redirect=https://evil.example'), env)).status).toBe(400)
    expect((await handleAuth(new Request('https://foreign.example/api/session'), env)).status).toBe(403)
  } finally { sqlite.close() }
})
