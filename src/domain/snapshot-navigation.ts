import type { CourseOffering, Semester } from './model'
import type { SnapshotIndex } from './snapshot-index'

export interface SnapshotOffering extends CourseOffering { pathPrefix: string }
export interface SnapshotConfig { semesters: Semester[]; offerings: SnapshotOffering[] }
export interface SearchableNote { path: string; text: string; offeringId: string | null; conflict: boolean }

export function parseSnapshotConfig(source: string): SnapshotConfig {
  const value = JSON.parse(source)
  if (!value || !Array.isArray(value.semesters) || !Array.isArray(value.offerings)) throw new Error('Konfigurasi harus memiliki array semesters dan offerings.')
  const ids = new Set<string>()
  for (const s of value.semesters) {
    if (!s || typeof s.id !== 'string' || !s.id.trim() || ids.has(s.id) || !Number.isInteger(s.number) || s.number < 1 || !(s.academicPeriod === null || typeof s.academicPeriod === 'string') || typeof s.active !== 'boolean') throw new Error('Semester invalid: ID unik, number positif, academicPeriod string/null dan active boolean wajib.')
    ids.add(s.id)
  }
  if (value.semesters.filter((s: Semester) => s.active).length > 1) throw new Error('Maksimum satu semester aktif.')
  const offeringIds = new Set<string>()
  for (const o of value.offerings) {
    if (!o || typeof o.id !== 'string' || !o.id.trim() || offeringIds.has(o.id) || !ids.has(o.semesterId) || typeof o.courseCode !== 'string' || !o.courseCode.trim() || typeof o.name !== 'string' || !o.name.trim() || !(o.credits === null || (Number.isInteger(o.credits) && o.credits > 0)) || typeof o.pathPrefix !== 'string' || !o.pathPrefix || o.pathPrefix.startsWith('/') || /[\\:\u0000-\u001f]/.test(o.pathPrefix) || o.pathPrefix.split('/').some((p: string) => !p || p === '.' || p === '..')) throw new Error('Offering invalid: ID unik, semester terdaftar, kode/nama, credits positif/null dan pathPrefix aman wajib.')
    offeringIds.add(o.id)
  }
  for (const a of value.offerings) for (const b of value.offerings) {
    if (a !== b && (a.pathPrefix === b.pathPrefix || a.pathPrefix.startsWith(b.pathPrefix + '/'))) throw new Error('Prefix offering tumpang tindih; pilih folder yang berbeda agar catatan tidak tercampur.')
  }
  return value as SnapshotConfig
}

export function prepareSnapshotSearch(index: SnapshotIndex, config: SnapshotConfig): SearchableNote[] {
  const decoder = new TextDecoder()
  return index.notes.map(note => ({
    path: note.canonicalPath,
    text: (note.canonicalPath + '\n' + note.versions.map(v => decoder.decode(v.bytes)).join('\n')).toLocaleLowerCase('id'),
    offeringId: config.offerings.find(o => note.canonicalPath === o.pathPrefix || note.canonicalPath.startsWith(o.pathPrefix + '/'))?.id ?? null,
    conflict: note.versions.length > 1,
  }))
}

export function searchSnapshot(notes: readonly SearchableNote[], query: string, offeringIds: ReadonlySet<string> | null, unmapped = false): SearchableNote[] {
  const terms = query.toLocaleLowerCase('id').trim().split(/\s+/).filter(Boolean)
  return notes.filter(note => (unmapped ? note.offeringId === null : offeringIds === null || (note.offeringId !== null && offeringIds.has(note.offeringId))) && terms.every(term => note.text.includes(term)))
}
