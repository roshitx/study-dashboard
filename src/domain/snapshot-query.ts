import type { IndexedNote, IndexedVersion, SnapshotIndex } from './snapshot-index'

export interface QueryRow { path: string; hash: string; values: unknown[] }
export interface QueryResult { columns: string[]; rows: QueryRow[]; error: string | null }
const fieldPattern = '(?:[a-z_][a-z_0-9]*|file\\.(?:name|folder|link)|length\\(related\\))'
const fieldRegex = new RegExp('^' + fieldPattern + '$', 'i')
function value(note: IndexedNote, version: IndexedVersion, field: string): unknown {
  const path = note.canonicalPath
  if (field === 'file.name') return path.split('/').pop()!.replace(/\.md$/i, '')
  if (field === 'file.folder') return path.slice(0, path.lastIndexOf('/'))
  if (field === 'length(related)') { if (version.diagnostics.some(d => d.includes('related') || d.includes('YAML') || d.includes('Metadata'))) return null; const related = version.properties.get('related'); return Array.isArray(related) ? related.length : related == null ? 0 : null }
  if (field === 'file.link') return path
  return version.properties.get(field) ?? null
}
function compare(a: unknown, b: unknown): number {
  if (a == null) return b == null ? 0 : 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

export function runSnapshotQuery(index: SnapshotIndex, current: IndexedNote, source: string): QueryResult {
  try {
    if (source.length > 10000) throw new Error('Query terlalu panjang.')
    const lines = source.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    const table = /^TABLE\s+(.+)$/i.exec(lines.shift() ?? '')
    if (!table) throw new Error('Hanya TABLE didukung.')
    const columns = table[1]!.split(',').map(column => {
      const match = new RegExp('^(' + fieldPattern + ')(?:\\s+as\\s+([a-z_][a-z_0-9]*))?$', 'i').exec(column.trim())
      if (!match) throw new Error('Kolom tidak didukung.')
      return { field: match[1]!, label: match[2] ?? match[1]! }
    })
    let folder = ''; let where = ''; let sort = ''; let limit = 2000
    const seen = new Set<string>()
    for (const line of lines) {
      const match = /^(FROM|WHERE|SORT|LIMIT)\s+(.+)$/i.exec(line)
      if (!match || seen.has(match[1]!.toUpperCase())) throw new Error('Clause tidak didukung atau berulang.')
      const clause = match[1]!.toUpperCase(); seen.add(clause)
      if (clause === 'FROM') { const path = /^"([^"\n]+)"$/.exec(match[2]!); if (!path) throw new Error('FROM harus folder literal.'); folder = path[1]! }
      if (clause === 'WHERE') where = match[2]!
      if (clause === 'SORT') sort = match[2]!
      if (clause === 'LIMIT') { if (!/^\d{1,4}$/.test(match[2]!)) throw new Error('LIMIT invalid.'); limit = Number(match[2]); if (limit > 2000) throw new Error('LIMIT maksimum 2000.') }
    }
    const predicates = where ? where.split(/\s+AND\s+/i).map(condition => {
      if (condition === 'contains(file.folder, this.file.folder)') return (n: IndexedNote, v: IndexedVersion) => String(value(n, v, 'file.folder')).includes(current.canonicalPath.slice(0, current.canonicalPath.lastIndexOf('/')))
      const match = new RegExp('^(' + fieldPattern + ')(?:\\s*(!=|=|<)\\s*("[^"\\n]*"|\\d+))?$').exec(condition)
      if (!match) throw new Error('WHERE tidak didukung.')
      return (n: IndexedNote, v: IndexedVersion) => {
        const actual = value(n, v, match[1]!)
        if (!match[2]) return actual !== null && actual !== false && actual !== ''
        const expected: string | number = match[3]!.startsWith('"') ? match[3]!.slice(1, -1) : Number(match[3])
        return match[2] === '=' ? actual === expected : match[2] === '!=' ? actual !== expected : typeof actual === 'number' && typeof expected === 'number' && actual < expected
      }
    }) : []
    const sorts = sort ? sort.split(',').map(part => {
      const match = /^(\S+)(?:\s+(ASC|DESC))?$/i.exec(part.trim())
      if (!match || !fieldRegex.test(match[1]!)) throw new Error('SORT tidak didukung.')
      return { field: match[1]!, direction: match[2]?.toUpperCase() === 'DESC' ? -1 : 1 }
    }) : []
    const entries = index.notes.flatMap(note => note.versions.map(version => ({ note, version }))).filter(({ note, version }) => {
      const paths = [note.canonicalPath, ...version.sourcePaths]
      return (!folder || paths.some(path => path.startsWith(folder + '/'))) && predicates.every(predicate => predicate(note, version))
    })
    entries.sort((a, b) => {
      for (const rule of sorts) { const av = value(a.note, a.version, rule.field); const bv = value(b.note, b.version, rule.field); const result = av == null || bv == null ? compare(av, bv) : compare(av, bv) * rule.direction; if (result) return result }
      return a.note.canonicalPath.localeCompare(b.note.canonicalPath) || a.version.hash.localeCompare(b.version.hash)
    })
    return { columns: columns.map(c => c.label), rows: entries.slice(0, limit).map(({ note, version }) => ({ path: note.canonicalPath, hash: version.hash, values: columns.map(c => value(note, version, c.field)) })), error: null }
  } catch (error) { return { columns: [], rows: [], error: error instanceof Error ? error.message : 'Query invalid.' } }
}

export function snapshotReport(index: SnapshotIndex) {
  const versions = index.notes.flatMap(note => note.versions)
  const queries = index.notes.flatMap(note => note.versions.flatMap(version => [...new TextDecoder().decode(version.bytes).matchAll(/```dataview\s*\r?\n([\s\S]*?)```/g)].map(match => ({ note, source: match[1]! }))))
  return { notes: index.notes.length, hubs: index.notes.filter(n => /(?:^|\/)00 - Course Hub\.md$/i.test(n.canonicalPath)).length, versions: versions.length, duplicates: index.duplicateCount, conflicts: index.conflictCount, metadataFailures: versions.filter(v => v.diagnostics.length).length, queries: queries.length, queryFailures: queries.filter(q => runSnapshotQuery(index, q.note, q.source).error !== null).length }
}
