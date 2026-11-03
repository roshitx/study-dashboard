import { test, expect } from 'bun:test'
import { canonicalPath, indexSnapshot } from '../src/domain/snapshot-index'

const encode = new TextEncoder()
test('maps only boundary-matching explicit prefixes and preserves source bytes/properties', async () => {
  const raw = '\uFEFF---\r\ncourse_code: MKDI4201\r\nsource_course_code: MKWI4201\r\nmodule: seven\r\nmodule_number: 7\r\nlecture_number: 2\r\nsession_number: 6\r\nunknown: false\r\nempty: null\r\n---\r\n# Source\r\n'
  const bytes = encode.encode(raw)
  const index = await indexSnapshot([{ path: 'vault/University/a.md', bytes }], 'University', ['vault/University'])
  const note = index.notes[0]
  expect(note.canonicalPath).toBe('University/a.md')
  expect(note.versions[0].bytes).toEqual(bytes)
  expect(note.versions[0].rawFrontmatter).toBe(raw.slice(0, raw.indexOf('# Source')))
  expect(Object.fromEntries(note.versions[0].properties)).toEqual({ course_code: 'MKDI4201', source_course_code: 'MKWI4201', module: 'seven', module_number: 7, lecture_number: 2, session_number: 6, unknown: false, empty: null })
  expect(canonicalPath('UniversityExtra/a.md', 'University', [])).toBe('UniversityExtra/a.md')
  expect(() => canonicalPath('../a.md', 'University', [])).toThrow()
})

test('deduplicates only same canonical path and hash while retaining conflict versions', async () => {
  const a = encode.encode('one'), b = encode.encode('two')
  const index = await indexSnapshot([{ path: 'University/a.md', bytes: a }, { path: 'vault/University/a.md', bytes: a }, { path: 'University/a.md', bytes: b }, { path: 'University/b.md', bytes: a }], 'University', ['vault/University'])
  expect(index.duplicateCount).toBe(1)
  expect(index.conflictCount).toBe(1)
  expect(index.notes).toHaveLength(2)
  expect(index.notes[0].versions.map(v => new TextDecoder().decode(v.bytes))).toEqual(['one', 'two'])
  expect(index.notes[0].versions[0].sourcePaths).toEqual(['University/a.md', 'vault/University/a.md'])
  expect(index.notes[0].versions[0].hash).toBe('7692c3ad3540bb803c020b3aee66cd8887123234ea0c6e7143c0add73ff431ed')
})

test('reports unquoted wikilink ambiguity, invalid YAML and alias expansion without changing raw source', async () => {
  for (const yaml of ['related: [[Other]]\nquoted: "[[Safe]]"', 'a: 1\na: 2', 'a: &a [1]\nb: *a']) {
    const bytes = encode.encode('---\n' + yaml + '\n---\ntext')
    const index = await indexSnapshot([{ path: 'a.md', bytes }], 'University', [])
    const version = index.notes[0].versions[0]
    expect(version.bytes).toEqual(bytes)
    expect(version.diagnostics.length).toBeGreaterThan(0)
    expect(version.properties.has('related')).toBe(false)
  }
})
