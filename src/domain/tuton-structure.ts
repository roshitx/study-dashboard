import type { TutonDetection } from './tuton'
export function tutonStructure(detected: TutonDetection): string {
  return JSON.stringify({ courses: detected.courses.map(c => [c.row, c.courseCode, c.classId]), columns: detected.columns.map(c => [c.column, c.sessionNumber, c.activity, c.dateLabel]) })
}
