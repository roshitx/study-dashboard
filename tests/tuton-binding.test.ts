import { expect, test } from 'bun:test'
import { resolveTutonOfferings } from '../src/domain/tuton-binding'
import type { AcademicMetadata } from '../src/domain/metadata'
const metadata: AcademicMetadata = { semesters: [{ id: 's1', number: 1, academicPeriod: null, active: false }, { id: 's2', number: 2, academicPeriod: null, active: true }], courses: [{ id: 'c', courseCode: 'ABCD1234', sourceCourseCode: null, name: 'Synthetic' }], offerings: [{ id: 'o1', semesterId: 's1', courseId: 'c', classId: '10', credits: null }, { id: 'o2', semesterId: 's2', courseId: 'c', classId: '20', credits: null }], tutonBindings: [{ offeringId: 'o1', sheetId: 7, sourceCourse: 'ABCD1234.10' }, { offeringId: 'o2', sheetId: 7, sourceCourse: 'ABCD1234.20' }] }
test('semester selection cannot leak another offering or silently accept changed class', () => {
  const courses = [{ row: 4, courseCode: 'ABCD1234', classId: '20', name: 'Synthetic' }]
  expect(resolveTutonOfferings(metadata, 's2', 7, courses)).toEqual([{ offeringId: 'o2', source: courses[0], error: null }])
  expect(resolveTutonOfferings(metadata, 's1', 7, courses)).toEqual([{ offeringId: 'o1', source: null, error: 'Identitas mata kuliah/kelas hilang atau ambigu pada sumber terbaru.' }])
  expect(resolveTutonOfferings(metadata, 's2', 8, courses)).toEqual([])
  expect(resolveTutonOfferings(metadata, 's2', 7, [...courses, ...courses])[0]?.source).toBeNull()
})
