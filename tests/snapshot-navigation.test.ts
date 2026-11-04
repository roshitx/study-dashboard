import { test, expect } from 'bun:test'
import { parseSnapshotConfig, prepareSnapshotSearch, searchSnapshot } from '../src/domain/snapshot-navigation'
import { indexSnapshot } from '../src/domain/snapshot-index'

const config = { semesters: [{ id: 's1', number: 1, academicPeriod: '2026.1', active: false }, { id: 's3', number: 3, academicPeriod: null, active: true }], offerings: [{ id: 'a1', semesterId: 's1', courseCode: 'A', name: 'Same course', credits: 3, pathPrefix: 'University/S1/A' }, { id: 'a3', semesterId: 's3', courseCode: 'A', name: 'Same course', credits: null, pathPrefix: 'University/S3/A' }] }

test('semester 3 config preserves academic period and unknown credits; invalid mappings fail explicitly', () => {
  const parsed = parseSnapshotConfig(JSON.stringify(config))
  expect(parsed.semesters[1].academicPeriod).toBeNull()
  expect(parsed.offerings[1].credits).toBeNull()
  expect(() => parseSnapshotConfig(JSON.stringify({ ...config, offerings: [{ ...config.offerings[0], semesterId: 'missing' }] }))).toThrow()
  expect(() => parseSnapshotConfig(JSON.stringify({ ...config, offerings: [config.offerings[0], { ...config.offerings[1], pathPrefix: 'University/S1/A/sub' }] }))).toThrow()
  expect(() => parseSnapshotConfig('{')).toThrow()
})

test('search remains offering scoped, retains unmapped notes and searches every conflict version', async () => {
  const index = await indexSnapshot([{ path: 'University/S1/A/one.md', bytes: new TextEncoder().encode('earlier') }, { path: 'University/S3/A/one.md', bytes: new TextEncoder().encode('later') }, { path: 'University/S3/A/one.md', bytes: new TextEncoder().encode('CONFLICT CONTENT') }, { path: 'University/S3/AB/unmapped.md', bytes: new TextEncoder().encode('other') }], 'University', [])
  const notes = prepareSnapshotSearch(index, parseSnapshotConfig(JSON.stringify(config)))
  expect(searchSnapshot(notes, 'earlier', new Set(['a3']))).toEqual([])
  expect(searchSnapshot(notes, 'conflict content', new Set(['a3'])).map(n => n.path)).toEqual(['University/S3/A/one.md'])
  expect(searchSnapshot(notes, '', null, true).map(n => n.path)).toEqual(['University/S3/AB/unmapped.md'])
  expect(searchSnapshot(notes, 'one.md', new Set(['a1']))[0].offeringId).toBe('a1')
})
