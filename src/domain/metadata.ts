export interface AcademicMetadata {
  semesters: { id: string; number: number; academicPeriod: string | null; active: boolean }[]
  courses: { id: string; courseCode: string; sourceCourseCode: string | null; name: string }[]
  offerings: { id: string; semesterId: string; courseId: string; classId: string | null; credits: number | null }[]
  tutonBindings?: { offeringId: string; sheetId: number; sourceCourse: string; spreadsheetId?: string; structure?: string }[]
}

function record(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_input')
  const row = value as Record<string, unknown>
  if (Object.keys(row).length !== fields.length || fields.some(key => !Object.hasOwn(row, key))) throw new Error('invalid_input')
  return row
}
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value)
}
function id(value: unknown): value is string { return text(value, 64) && /^[a-zA-Z0-9_-]+$/.test(value) }
function nullableText(value: unknown, max: number) { return value === null || text(value, max) }
function rows(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('invalid_input')
  return value
}

export function parseAcademicMetadata(value: unknown): AcademicMetadata {
  const fields = ['semesters', 'courses', 'offerings']
  if (value && typeof value === 'object' && Object.hasOwn(value, 'tutonBindings')) fields.push('tutonBindings')
  const root = record(value, fields)
  const semesters = new Set<string>(); const numbers = new Set<number>(); let active = false
  for (const item of rows(root.semesters, 40)) {
    const s = record(item, ['id', 'number', 'academicPeriod', 'active'])
    if (!id(s.id) || semesters.has(s.id) || !Number.isInteger(s.number) || (s.number as number) < 1 || (s.number as number) > 100 || numbers.has(s.number as number) || !nullableText(s.academicPeriod, 64) || typeof s.active !== 'boolean' || (s.active && active)) throw new Error('invalid_input')
    semesters.add(s.id); numbers.add(s.number as number); active ||= s.active
  }
  const courses = new Set<string>(); const codes = new Set<string>()
  for (const item of rows(root.courses, 300)) {
    const c = record(item, ['id', 'courseCode', 'sourceCourseCode', 'name'])
    if (!id(c.id) || courses.has(c.id) || !text(c.courseCode, 32) || codes.has(c.courseCode) || !nullableText(c.sourceCourseCode, 32) || !text(c.name, 160)) throw new Error('invalid_input')
    courses.add(c.id); codes.add(c.courseCode)
  }
  const offerings = new Set<string>(); const pairs = new Set<string>()
  for (const item of rows(root.offerings, 600)) {
    const o = record(item, ['id', 'semesterId', 'courseId', 'classId', 'credits'])
    if (!id(o.id) || offerings.has(o.id) || !id(o.semesterId) || !semesters.has(o.semesterId) || !id(o.courseId) || !courses.has(o.courseId) || !nullableText(o.classId, 64) || !(o.credits === null || (Number.isInteger(o.credits) && (o.credits as number) > 0 && (o.credits as number) <= 30))) throw new Error('invalid_input')
    const pair = o.semesterId + ':' + o.courseId
    if (pairs.has(pair)) throw new Error('invalid_input')
    offerings.add(o.id); pairs.add(pair)
  }
  const bound = new Set<string>()
  const courseRows = root.courses as AcademicMetadata['courses']
  const offeringRows = root.offerings as AcademicMetadata['offerings']
  for (const item of rows(root.tutonBindings === undefined ? [] : root.tutonBindings, 600)) {
    const fields = ['offeringId', 'sheetId', 'sourceCourse']
    if (item && typeof item === 'object' && Object.hasOwn(item, 'spreadsheetId')) fields.push('spreadsheetId')
    if (item && typeof item === 'object' && Object.hasOwn(item, 'structure')) fields.push('structure')
    const b = record(item, fields)
    if (b.spreadsheetId !== undefined && (typeof b.spreadsheetId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(b.spreadsheetId))) throw new Error('invalid_input')
    if (b.structure !== undefined && !text(b.structure, 16384)) throw new Error('invalid_input')
    if (!id(b.offeringId) || !offerings.has(b.offeringId) || bound.has(b.offeringId) || !Number.isSafeInteger(b.sheetId) || Number(b.sheetId) < 0 || !text(b.sourceCourse, 96)) throw new Error('invalid_input')
    const offering = offeringRows.find(o => o.id === b.offeringId)!
    const course = courseRows.find(c => c.id === offering.courseId)!
    if (b.sourceCourse !== course.courseCode + (offering.classId ? '.' + offering.classId : '')) throw new Error('invalid_input')
    bound.add(b.offeringId)
  }
  return value as AcademicMetadata
}
