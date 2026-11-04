import { test, expect } from 'bun:test'
import { indexSnapshot } from '../src/domain/snapshot-index'
import { resolveSnapshotLink } from '../src/domain/snapshot-links'

test('resolves relative, vault-prefix and aliases without choosing ambiguous basenames', async () => {
  const index = await indexSnapshot(['vault/A/start.md', 'vault/A/topic.md', 'vault/B/topic.md', 'vault/B/end.md'].map(path => ({ path, bytes: new TextEncoder().encode('# Heading') })), 'University', ['vault'])
  const current = index.notes[0]!
  expect(resolveSnapshotLink(index, current, './topic#Heading|Alias')).toMatchObject({ status: 'found', note: { canonicalPath: 'University/A/topic.md' }, heading: 'Heading' })
  expect(resolveSnapshotLink(index, current, 'vault/B/end')).toMatchObject({ status: 'found', note: { canonicalPath: 'University/B/end.md' } })
  expect(resolveSnapshotLink(index, index.notes[3]!, 'start')).toMatchObject({ status: 'found', note: { canonicalPath: 'University/A/start.md' } })
  const root = await indexSnapshot([{ path: 'vault/start.md', bytes: new Uint8Array() }, ...['vault/A/topic.md', 'vault/B/topic.md'].map(path => ({ path, bytes: new Uint8Array() }))], 'University', ['vault'])
  expect(resolveSnapshotLink(root, root.notes[0]!, 'topic')).toMatchObject({ status: 'ambiguous', candidates: ['University/A/topic.md', 'University/B/topic.md'] })
  expect(resolveSnapshotLink(index, current, 'outside')).toMatchObject({ status: 'missing' })
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', '%ZZ', '../../../secret']) expect(resolveSnapshotLink(index, current, url).status).toBe('unsafe')
})
