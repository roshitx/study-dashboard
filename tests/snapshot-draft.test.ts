import { test, expect } from 'bun:test'
import { indexSnapshot } from '../src/domain/snapshot-index'
import { draftBody, draftBytes, exportSnapshotLayer } from '../src/domain/snapshot-draft'
import { importLocalFiles } from '../src/integrations/local-import'

test('unchanged bytes and metadata survive edit/export/reimport with both conflict versions', async () => {
  const text = '\uFEFF---\r\nunknown: false # preserve comment\r\ncredits: null\r\n---\r\n# Judul\r\n\r\nParagraf lama.\r\n'
  const bytes = new TextEncoder().encode(text)
  const original = await indexSnapshot([{ path: 'University/course/note.md', bytes }], 'University', [])
  const version = original.notes[0]!.versions[0]!
  expect(draftBytes(version, draftBody(version))).toBe(bytes)
  const edited = draftBytes(version, draftBody(version).replace('lama', 'baru'))
  expect(new TextDecoder('utf-8', { ignoreBOM: true }).decode(edited)).toBe(text.replace('lama', 'baru'))
  const index = await indexSnapshot([{ path: 'University/course/note.md', bytes }, { path: 'University/course/note.md', bytes: edited }], 'University', [])
  const files = await Promise.all([0, 1].map(async layer => new File([await exportSnapshotLayer(index, layer)], `snapshot-${layer}.zip`)))
  const report = await importLocalFiles(files)
  expect(report.diagnostics).toEqual([])
  const restored = await indexSnapshot(report.files, 'University', [])
  expect(restored.conflictCount).toBe(1)
  expect(restored.notes[0]!.versions.map(v => Array.from(v.bytes))).toEqual([Array.from(bytes), Array.from(edited)])
  expect(() => draftBytes(version, 'bad\0body')).toThrow()
})
