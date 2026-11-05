import { test, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import { handleMetadata, type MetadataEnv } from '../src/integrations/metadata.server'
import { tokenHash } from '../src/integrations/auth.server'

const metadata = {
  semesters: [{ id: 's3', number: 3, academicPeriod: null, active: true }],
  courses: [{ id: 'english', courseCode: 'MKDI4201', sourceCourseCode: 'MKWI4201', name: 'Synthetic English' }],
  offerings: [{ id: 'english-s3', semesterId: 's3', courseId: 'english', classId: null, credits: null }],
}
async function setup() {
  const sqlite = new Database(':memory:')
  for (const path of ['migrations-auth/0001_sessions.sql', 'migrations/0001_initial.sql', 'migrations/0002_owner_metadata.sql']) sqlite.exec(await Bun.file(path).text())
  const db = {
    prepare(sql: string) {
      let values: (string | number)[] = []
      const statement = { bind(...input: (string | number)[]) { values = input; return statement }, async first<T>() { return sqlite.query(sql).get(...values) as T | null }, async run() { return sqlite.query(sql).run(...values) } }
      return statement
    }
  }
  const env: MetadataEnv = { AUTH_DB: db, METADATA_DB: db, GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic', GOOGLE_REDIRECT_URI: 'https://study.example/api/auth/google/callback', AUTH_OWNER_EMAIL: 'owner@example.test' }
  const token = 'm'.repeat(43)
  sqlite.query('INSERT INTO auth_sessions VALUES (?, ?, ?, ?)').run(await tokenHash(token), 'owner-subject', 'owner@example.test', Math.floor(Date.now() / 1000) + 600)
  const headers = { Cookie: '__Host-study-session=' + token, Origin: 'https://study.example', 'Content-Type': 'application/json' }
  return { sqlite, env, headers }
}

test('metadata persists exact domain distinctions, isolates owners and rejects stale writes', async () => {
  const { sqlite, env, headers } = await setup()
  try {
    const send = (revision: number, value: unknown = metadata) => handleMetadata(new Request('https://study.example/api/metadata', { method: 'PUT', headers, body: JSON.stringify({ expectedRevision: revision, metadata: value }) }), env)
    expect(await (await send(0)).json()).toEqual({ revision: 1 })
    expect((await send(0)).status).toBe(409)
    expect((await send(99)).status).toBe(409)
    expect(await (await send(1, { ...metadata, offerings: [] })).json()).toEqual({ revision: 2 })
    const read = await handleMetadata(new Request('https://study.example/api/metadata', { headers }), env)
    expect(read.headers.get('Cache-Control')).toBe('no-store')
    expect(await read.json()).toEqual({ revision: 2, metadata: { ...metadata, offerings: [] } })
    sqlite.query('UPDATE auth_sessions SET subject = ?').run('other-subject')
    expect(await (await handleMetadata(new Request('https://study.example/api/metadata', { headers }), env)).json()).toEqual({ revision: 0, metadata: { semesters: [], courses: [], offerings: [] } })
    expect((await send(2)).status).toBe(409)
    sqlite.query('UPDATE auth_sessions SET subject = ?, email = ?').run('owner-subject', 'foreign@example.test')
    expect((await send(2)).status).toBe(403)
  } finally { sqlite.close() }
})

test('metadata rejects unauthenticated, cross-origin, oversized and arbitrary resource payloads', async () => {
  const { sqlite, env, headers } = await setup()
  try {
    const req = (body: string, overrides: Record<string, string> = {}) => new Request('https://study.example/api/metadata', { method: 'PUT', headers: { ...headers, ...overrides }, body })
    const body = JSON.stringify({ expectedRevision: 0, metadata })
    expect((await handleMetadata(new Request('https://study.example/api/metadata'), env)).status).toBe(401)
    expect((await handleMetadata(req(body, { Origin: 'https://foreign.example' }), env)).status).toBe(403)
    expect((await handleMetadata(req(body, { 'Content-Type': 'text/plain' }), env)).status).toBe(415)
    const oversized = await handleMetadata(req(' '.repeat(131073)), env)
    expect(oversized.status).toBe(413)
    expect(oversized.headers.get('Cache-Control')).toBe('no-store')
    for (const invalid of [
      { ...metadata, owner_id: 'other' },
      { ...metadata, notes: 'private note' },
      { ...metadata, offerings: [{ ...metadata.offerings[0], credits: 0 }] },
      { ...metadata, offerings: [{ ...metadata.offerings[0], semesterId: 'missing' }] },
      { ...metadata, courses: [{ ...metadata.courses[0], url: 'https://foreign.example' }] },
      { ...metadata, semesters: [...metadata.semesters, { ...metadata.semesters[0], id: 's4', number: 4 }] },
    ]) expect((await handleMetadata(req(JSON.stringify({ expectedRevision: 0, metadata: invalid })), env)).status).toBe(400)
    expect((await handleMetadata(req(body), { ...env, METADATA_DB: undefined })).status).toBe(503)
    expect(sqlite.query('SELECT count(*) AS count FROM academic_metadata').get()).toEqual({ count: 0 })
  } finally { sqlite.close() }
})
