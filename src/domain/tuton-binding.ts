import type { AcademicMetadata } from './metadata'
import type { TutonCourse } from './tuton'

export interface ResolvedTutonOffering { offeringId: string; source: TutonCourse | null; error: string | null }
export function resolveTutonOfferings(metadata: AcademicMetadata, semesterId: string, sheetId: number, courses: TutonCourse[]): ResolvedTutonOffering[] {
  const result: ResolvedTutonOffering[] = []
  for (const binding of metadata.tutonBindings ?? []) {
    const offering = metadata.offerings.find(o => o.id === binding.offeringId && o.semesterId === semesterId)
    if (!offering || binding.sheetId !== sheetId) continue
    const course = metadata.courses.find(c => c.id === offering.courseId)
    const matches = courses.filter(c => c.courseCode === course?.courseCode && c.classId === offering.classId && c.courseCode + (c.classId ? '.' + c.classId : '') === binding.sourceCourse)
    result.push({ offeringId: offering.id, source: matches.length === 1 ? matches[0]! : null, error: matches.length === 1 ? null : 'Identitas mata kuliah/kelas hilang atau ambigu pada sumber terbaru.' })
  }
  return result
}
