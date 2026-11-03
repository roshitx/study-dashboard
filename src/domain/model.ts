export type NoteState = 'seed' | 'working' | 'complete' | 'done' | 'raw' | 'unknown'
export type SubmissionState = 'unknown' | 'not_started' | 'draft' | 'ready' | 'submitted' | 'graded'
export interface Semester { id: string; number: number; academicPeriod: string | null; active: boolean }
export interface CourseOffering { id: string; semesterId: string; courseCode: string; name: string; credits: number | null }
export interface NoteRecord { id: string; path: string; offeringId: string; title: string; markdown: string; state: NoteState; source: 'demo' | 'snapshot' | 'live' }
export interface AcademicActivity {
  id: string; offeringId: string; kind: 'discussion' | 'assignment' | 'reading' | 'attendance';
  title: string; submission: SubmissionState; grade: number | null;
  sessionNumber: number | null; moduleNumbers: number[];
  deadline: { date: string; time: string | null; timeZone: 'Asia/Jakarta' } | null;
}
export type IntegrationResult<T> =
  | { status: 'success'; data: T; source: 'live'; fetchedAt: string }
  | { status: 'not_configured'; integration: string }
  | { status: 'conflict'; currentRevision: string }
  | { status: 'error'; code: string; retryable: boolean }
