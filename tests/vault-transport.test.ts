import { test, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import { tokenHash } from '../src/integrations/auth.server'
import { handleVault, type VaultEnv } from '../src/integrations/vault.server'

async function setup() {
  const sqlite = new Database(':memory:')
  sqlite.exec(await Bun.file('migrations-auth/0001_sessions.sql').text())
  const db = {
    prepare(sql: string) {
      let values: (string | number)[] = []
      const statement = { bind(...input: (string | number)[]) { values = input; return statement }, async first<T>() { return sqlite.query(sql).get(...values) as T | null }, async run() { return sqlite.query(sql).run(...values) } }
      return statement
    }
  }
  const token = 'v'.repeat(43)
  sqlite.query('INSERT INTO auth_sessions VALUES (?, ?, ?, ?)').run(await tokenHash(token), 'owner', 'owner@example.test', Math.floor(Date.now() / 1000) + 600)
  const calls: unknown[] = []
  const bucket = {
    async list(options: { prefix: string; limit: number; cursor?: string }) {
      calls.push(options)
      return options.cursor ? { objects: [{ key: 'interop/second', size: 2 }], truncated: false as const } : { objects: [{ key: 'interop/first', size: 3 }], truncated: true as const, cursor: 'next+cursor=' }
    },
    async get(key: string) {
      calls.push(key)
      if (key === 'interop/missing') return null
      if (key === 'interop/large') return { size: 8 * 1024 * 1024 + 1, body: new ReadableStream<Uint8Array>() }
      return { size: 3, body: new Blob([new Uint8Array([1, 2, 3])]).stream() }
    },
  }
  const env: VaultEnv = { AUTH_DB: db, GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic', GOOGLE_REDIRECT_URI: 'https://study.example/api/auth/google/callback', AUTH_OWNER_EMAIL: 'owner@example.test', VAULT_TEST_BUCKET: bucket }
  const headers = { Cookie: '__Host-study-session=' + token }
  const send = (path: string, init: RequestInit = {}) => handleVault(new Request('https://study.example' + path, { ...init, headers }), env)
  return { sqlite, env, calls, send }
}

test('vault authenticates before accessing the binding', async () => {
  const { sqlite, env, calls, send } = await setup()
  try {
    const anonymous = await handleVault(new Request('https://study.example/api/vault/list'), env)
    expect(anonymous.status).toBe(401)
    expect(anonymous.headers.get('Cache-Control')).toBe('no-store')
    sqlite.query('UPDATE auth_sessions SET email = ?').run('foreign@example.test')
    expect((await send('/api/vault/list')).status).toBe(403)
    expect(calls).toEqual([])
  } finally { sqlite.close() }
})

test('vault lists only relative keys with bounded pagination', async () => {
  const { sqlite, calls, send } = await setup()
  try {
    const first = await send('/api/vault/list')
    expect(first.headers.get('Cache-Control')).toBe('no-store')
    expect(await first.json()).toEqual({ objects: [{ key: 'first', size: 3 }], cursor: 'next+cursor=' })
    expect(await (await send('/api/vault/list?cursor=next%2Bcursor%3D')).json()).toEqual({ objects: [{ key: 'second', size: 2 }], cursor: null })
    expect(calls).toEqual([{ prefix: 'interop/', limit: 100 }, { prefix: 'interop/', limit: 100, cursor: 'next+cursor=' }])
  } finally { sqlite.close() }
})

test('vault rejects invalid paths, parameters, cursors and methods', async () => {
  const { sqlite, calls, send } = await setup()
  try {
    for (const path of ['/api/vault/list?prefix=other', '/api/vault/list?cursor=', '/api/vault/list?cursor=a&cursor=b', '/api/vault/list?cursor=' + 'a'.repeat(1025), '/api/vault/list?cursor=%0A', '/api/vault/object', '/api/vault/object?key=../other', '/api/vault/object?key=%2Fother', '/api/vault/object?key=a%2F..%2Fb', '/api/vault/object?key=a%5Cb', '/api/vault/object?key=a&key=b', '/api/vault/object?key=a&prefix=x', '/api/vault/other']) expect((await send(path)).status).toBe(400)
    expect((await send('/api/vault/list', { method: 'POST' })).status).toBe(405)
    expect(calls).toEqual([])
  } finally { sqlite.close() }
})

test('vault reads bounded encrypted bytes and reports generic failures', async () => {
  const { sqlite, env, calls, send } = await setup()
  try {
    const object = await send('/api/vault/object?key=dir%2Ffile')
    expect(object.status).toBe(200)
    expect(object.headers.get('Cache-Control')).toBe('no-store')
    expect(Array.from(new Uint8Array(await object.arrayBuffer()))).toEqual([1, 2, 3])
    expect(calls).toEqual(['interop/dir/file'])
    expect((await send('/api/vault/object?key=missing')).status).toBe(404)
    expect((await send('/api/vault/object?key=large')).status).toBe(413)
    const unavailable = await handleVault(new Request('https://study.example/api/vault/list', { headers: { Cookie: '__Host-study-session=' + 'v'.repeat(43) } }), { ...env, VAULT_TEST_BUCKET: undefined })
    expect(unavailable.status).toBe(503)
    expect(unavailable.headers.get('Cache-Control')).toBe('no-store')
    env.VAULT_TEST_BUCKET = { ...env.VAULT_TEST_BUCKET!, async list() { throw new Error('private key') } }
    const failure = await send('/api/vault/list')
    expect(failure.status).toBe(503)
    expect(await failure.text()).not.toContain('private key')
  } finally { sqlite.close() }
})
