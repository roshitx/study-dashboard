import { expect, test } from 'bun:test'
import { WriteCoordinator, parseWriteRequest } from '../src/domain/tuton-write'
import type { WriteProvider, WriteRecord, WriteRequest, WriteStore, WriteTarget } from '../src/domain/tuton-write'

const request = (operationId = '123e4567-e89b-42d3-a456-426614174000'): WriteRequest => ({ operationId, offeringId: 'offering', sessionNumber: 1, activity: 'Diskusi', expectedValue: false, value: true })
function fixture() {
  const records = new Map<string, WriteRecord>()
  const store: WriteStore = { async get(key) { return records.get(key) }, async put(key, value) { records.set(key, structuredClone(value)) } }
  let current: boolean | number | null = false
  let writes = 0
  const provider: WriteProvider = {
    async prepare(_owner, input) { if (current !== input.expectedValue) throw Object.assign(new Error('conflict'), { code: 'conflict' }); return { identity: 'verified' } },
    async write(_target, value) { writes++; current = value },
    async read(_target: WriteTarget) { return current },
  }
  return { records, store, provider, writes: () => writes, set: (value: boolean | number | null) => { current = value } }
}

test('validates bounded strict input including finite values', () => {
  expect(parseWriteRequest(request())).toEqual(request())
  for (const bad of [{ ...request(), operationId: 'bad' }, { ...request(), value: NaN }, { ...request(), offeringId: '' }, { ...request(), sessionNumber: 0 }, { ...request(), extra: true }]) expect(() => parseWriteRequest(bad)).toThrow()
})

test('serializes writes and does not redispatch matching or colliding operations', async () => {
  const f = fixture(); const coordinator = new WriteCoordinator(f.store, f.provider)
  const first = request(); const second = { ...request('123e4567-e89b-42d3-a456-426614174001'), expectedValue: true, value: false }
  const results = await Promise.all([coordinator.execute('owner', first), coordinator.execute('owner', second)])
  expect(results.map(result => result.status)).toEqual(['confirmed', 'confirmed'])
  expect((await coordinator.execute('owner', first)).status).toBe('confirmed')
  expect((await coordinator.execute('owner', { ...first, value: false })).status).toBe('rejected')
  expect(f.writes()).toBe(2)
  expect(await coordinator.receipt('other', first.operationId)).toBeUndefined()
})

test('preserves false, null and zero without conflation', async () => {
  const f = fixture(); const coordinator = new WriteCoordinator(f.store, f.provider)
  for (const [index, expectedValue, value] of [[0, false, null], [1, null, 0], [2, 0, false]] as const) {
    const result = await coordinator.execute('owner', { ...request(`123e4567-e89b-42d3-a456-42661417400${index}`), expectedValue, value })
    expect(result).toEqual({ operationId: `123e4567-e89b-42d3-a456-42661417400${index}`, status: 'confirmed', value })
  }
})

test('recovers pending as uncertain and reconciles without writing again', async () => {
  const f = fixture(); const input = request(); const target = { identity: 'verified' }
  await f.store.put(JSON.stringify(['owner', input.operationId]), { owner: 'owner', input, target, receipt: { operationId: input.operationId, status: 'pending' } })
  f.set(true)
  const coordinator = new WriteCoordinator(f.store, f.provider)
  expect((await coordinator.execute('owner', input)).status).toBe('uncertain')
  expect((await coordinator.reconcile('owner', input.operationId))?.status).toBe('confirmed')
  expect(f.writes()).toBe(0)
})

test('dispatch errors and readback mismatch remain uncertain', async () => {
  const f = fixture(); f.provider.write = async () => { throw new Error('timeout') }
  const coordinator = new WriteCoordinator(f.store, f.provider)
  expect((await coordinator.execute('owner', request())).status).toBe('uncertain')
  expect((await coordinator.reconcile('owner', request().operationId))?.status).toBe('uncertain')
})

test('prepare errors are rejected without dispatch', async () => {
  const f = fixture(); f.set(true)
  const result = await new WriteCoordinator(f.store, f.provider).execute('owner', request())
  expect(result).toEqual({ operationId: request().operationId, status: 'rejected', code: 'conflict' })
  expect(f.writes()).toBe(0)
})
