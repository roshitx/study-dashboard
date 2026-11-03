import { parseDocument, isMap, isScalar } from 'yaml'

export interface SnapshotSource { path: string; bytes: Uint8Array }
export interface IndexedVersion {
  hash: string
  bytes: Uint8Array
  sourcePaths: string[]
  rawFrontmatter: string | null
  properties: ReadonlyMap<string, unknown>
  diagnostics: string[]
}
export interface IndexedNote { canonicalPath: string; versions: IndexedVersion[] }
export interface SnapshotIndex { notes: IndexedNote[]; duplicateCount: number; conflictCount: number }

export function canonicalPath(path: string, root: string, prefixes: readonly string[]): string {
  const clean = (value: string) => value.replace(/^\/+|\/+$/g, '')
  const target = clean(root)
  if (!target || [path, target, ...prefixes].some(v => v.includes('\\') || /[\u0000-\u001f\u007f:]/u.test(v) || v.split('/').some(p => p === '..' || p === '.'))) throw new Error('Root, prefix atau path tidak aman.')
  if (!path || path.startsWith('/') || path.split('/').some(p => !p)) throw new Error('Path sumber tidak valid.')
  // Longest explicit prefix wins; unmatched paths retain their full source structure.
  const prefix = [target, ...prefixes.map(clean)].filter(Boolean).sort((a, b) => b.length - a.length).find(p => path === p || path.startsWith(p + '/'))
  return prefix ? target + path.slice(prefix.length) : path
}

function metadata(bytes: Uint8Array) {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  const properties = new Map<string, unknown>()
  const diagnostics: string[] = []
  const opening = /^(?:\uFEFF)?---(?:\r\n|\n)/.exec(text)
  if (!opening) return { rawFrontmatter: null, properties, diagnostics }
  const rest = text.slice(opening[0].length)
  const closing = /^(?:---|\.\.\.)(?:\r?\n|$)/m.exec(rest)
  if (!closing) return { rawFrontmatter: text, properties, diagnostics: ['Frontmatter tidak memiliki delimiter penutup.'] }
  const rawFrontmatter = text.slice(0, opening[0].length + closing.index + closing[0].length)
  const yaml = rest.slice(0, closing.index)
  const doc = parseDocument(yaml, { schema: 'core', uniqueKeys: true, strict: true })
  if (doc.errors.length || doc.warnings.length) return { rawFrontmatter, properties, diagnostics: ['Frontmatter YAML invalid atau memiliki tag yang tidak didukung; sumber dipertahankan.'] }
  let values: Map<unknown, unknown>
  try { values = doc.toJS({ mapAsMap: true, maxAliasCount: 0 }) }
  catch { return { rawFrontmatter, properties, diagnostics: [...diagnostics, 'Alias YAML tidak didukung; properties tidak diproyeksikan.'] } }
  if (!isMap(doc.contents)) {
    if (doc.contents !== null) diagnostics.push('Frontmatter bukan mapping properties.')
    return { rawFrontmatter, properties, diagnostics }
  }
  for (const pair of doc.contents.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== 'string') { diagnostics.push('Nama property bukan string; tidak diproyeksikan.'); continue }
    const key = pair.key.value
    const source = pair.value?.range ? yaml.slice(pair.value.range[0], pair.value.range[1]) : ''
    if (/\[\[[\s\S]*?\]\]/.test(source) && !(isScalar(pair.value) && typeof pair.value.value === 'string')) {
      diagnostics.push(`Property ${key}: wikilink tidak dikutip ambigu; tidak dinormalisasi.`)
      continue
    }
    properties.set(key, values.get(key))
  }
  return { rawFrontmatter, properties, diagnostics }
}

export async function indexSnapshot(files: readonly SnapshotSource[], root: string, prefixes: readonly string[]): Promise<SnapshotIndex> {
  const notes = new Map<string, IndexedNote>()
  let duplicateCount = 0
  for (const file of files) {
    const path = canonicalPath(file.path, root, prefixes)
    const digest = await crypto.subtle.digest('SHA-256', file.bytes as Uint8Array<ArrayBuffer>)
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    let note = notes.get(path)
    if (!note) { note = { canonicalPath: path, versions: [] }; notes.set(path, note) }
    const existing = note.versions.find(v => v.hash === hash)
    if (existing) { existing.sourcePaths.push(file.path); duplicateCount++; continue }
    let parsed: { rawFrontmatter: string | null; properties: Map<string, unknown>; diagnostics: string[] }
    try { parsed = metadata(file.bytes) }
    catch { parsed = { rawFrontmatter: null, properties: new Map(), diagnostics: ['Metadata tidak dapat diproses; bytes sumber tetap dipertahankan.'] } }
    note.versions.push({ hash, bytes: file.bytes, sourcePaths: [file.path], ...parsed })
  }
  const result = [...notes.values()]
  return { notes: result, duplicateCount, conflictCount: result.filter(n => n.versions.length > 1).length }
}
