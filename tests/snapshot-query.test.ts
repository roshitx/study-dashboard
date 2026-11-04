import { test, expect } from 'bun:test'
import { indexSnapshot } from '../src/domain/snapshot-index'
import { runSnapshotQuery, snapshotReport } from '../src/domain/snapshot-query'

test('local TABLE filters folder boundaries, sorts dates and preserves null and conflicting versions', async () => {
  const files = [
    ['vault/Course/start.md', '---\nupdated: 2026-11-01\nrelated: []\n---\n```dataview\nTABLE file.link\nSORT updated DESC\n```'],
    ['vault/Course/00 - Course Hub.md', '---\nupdated: 2026-11-03\nrelated: ["start"]\n---\n- [ ] A. Answer'],
    ['vault/Course/start.md', '---\nupdated: 2026-11-02\nrelated: []\n---\nchanged'],
    ['vault/Course-other/outside.md', '---\nupdated: 2026-11-04\n---'],
  ].map(([path, body]) => ({ path: path!, bytes: new TextEncoder().encode(body!) }))
  const index = await indexSnapshot(files, 'University', ['vault'])
  const query = 'TABLE file.link as Note, length(related) as RelatedCount, sks\nFROM "vault/Course"\nWHERE length(related) = 0\nSORT updated DESC\nLIMIT 2'
  const result = runSnapshotQuery(index, index.notes[0]!, query)
  expect(result.error).toBeNull()
  expect(result.rows.map(row => row.values)).toEqual([['University/Course/start.md', 0, null], ['University/Course/start.md', 0, null]])
  expect(result.rows[0]!.hash).toBe(index.notes[0]!.versions[1]!.hash)
  expect(runSnapshotQuery(index, index.notes[0]!, 'TABLE file.link\nWHERE contains(file.folder, this.file.folder)').rows).toHaveLength(4)
  expect(snapshotReport(index)).toMatchObject({ notes: 3, hubs: 1, versions: 4, conflicts: 1, queries: 1, queryFailures: 0 })
  for (const unsafe of ['TABLE eval("alert(1)")', 'TABLE file.link\nWHERE window.alert(1)', 'TABLE file.link\nLIMIT 9999', 'LIST file.link']) expect(runSnapshotQuery(index, index.notes[0]!, unsafe).error).not.toBeNull()
  expect(index.notes[1]!.versions[0]!.bytes).toEqual(files[1]!.bytes)
})
