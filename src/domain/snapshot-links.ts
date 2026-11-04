import type { IndexedNote, SnapshotIndex } from './snapshot-index'

export type LinkResolution = { status: 'found'; note: IndexedNote; heading: string } | { status: 'missing' | 'ambiguous' | 'unsafe'; candidates: string[] }

function normalize(path: string): string | null {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') { if (!parts.length) return null; parts.pop() }
    else parts.push(part)
  }
  return parts.join('/')
}
const withoutExtension = (path: string) => path.replace(/\.md$/i, '')

export function resolveSnapshotLink(index: SnapshotIndex, current: IndexedNote, input: string): LinkResolution {
  let target: string
  try { target = decodeURIComponent(input.split('|')[0]!.trim()) } catch { return { status: 'unsafe', candidates: [] } }
  if (/^[a-z][a-z\d+.-]*:/i.test(target) || /[\\\u0000-\u001f\u007f]/u.test(target) || target.startsWith('//')) return { status: 'unsafe', candidates: [] }
  const hash = target.indexOf('#')
  const heading = hash < 0 ? '' : target.slice(hash + 1)
  const path = hash < 0 ? target : target.slice(0, hash)
  if (!path) return { status: 'found', note: current, heading }
  const paths = (note: IndexedNote) => [note.canonicalPath, ...note.versions.flatMap(v => v.sourcePaths)]
  const match = (candidates: IndexedNote[]): LinkResolution => candidates.length === 1 ? { status: 'found', note: candidates[0]!, heading } : { status: candidates.length ? 'ambiguous' : 'missing', candidates: candidates.map(n => n.canonicalPath) }
  const relative = new Set(paths(current).map(p => normalize(p.slice(0, p.lastIndexOf('/') + 1) + path)).filter((p): p is string => p !== null).map(withoutExtension))
  const local = index.notes.filter(n => paths(n).some(p => relative.has(withoutExtension(p))))
  if (local.length) return match(local)
  if (path.startsWith('.') && !normalize(current.canonicalPath.slice(0, current.canonicalPath.lastIndexOf('/') + 1) + path)) return { status: 'unsafe', candidates: [] }
  const absolute = normalize(path)
  if (absolute === null) return { status: 'unsafe', candidates: [] }
  const exact = index.notes.filter(n => paths(n).some(p => withoutExtension(p) === withoutExtension(absolute)))
  if (exact.length) return match(exact)
  return match(index.notes.filter(n => paths(n).some(p => withoutExtension(p).endsWith('/' + withoutExtension(absolute)))))
}

export function headingId(text: string): string {
  return text.normalize('NFKC').trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '-')
}
