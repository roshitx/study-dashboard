import type { CourseOffering, NoteRecord, Semester } from '../domain/model.ts'
// Synthetic examples, not an import of the user's notes or actual progress.
export const semesters: Semester[] = [
  { id: 'demo-s1', number: 1, academicPeriod: null, active: false },
  { id: 'demo-s2', number: 2, academicPeriod: null, active: true },
]
export const offerings: CourseOffering[] = [
  { id: 'demo-en', semesterId: 'demo-s2', courseCode: 'MKDI4201', name: 'Bahasa Inggris', credits: 3 },
  { id: 'demo-db', semesterId: 'demo-s2', courseCode: 'STSI4105', name: 'Basis Data', credits: 3 },
  { id: 'demo-is', semesterId: 'demo-s1', courseCode: 'STSI4101', name: 'Pengantar Sistem Informasi', credits: null },
]
export const notes: NoteRecord[] = [
  { id: 'demo-note-1', offeringId: 'demo-en', path: 'Semester 2/Bahasa Inggris/Materi/Contoh.md', title: 'Contoh catatan belajar', state: 'working', source: 'demo', markdown: '---\ncourse_code: MKDI4201\nsemester: 2\nstatus: working\n---\n\n# Contoh catatan belajar\n\nIni data sintetis untuk mencoba editor.\n\n## Yang ingin dipahami\n\nTuliskan pertanyaan Anda di sini.\n' },
  { id: 'demo-note-2', offeringId: 'demo-db', path: 'Semester 2/Basis Data/Materi/Contoh.md', title: 'Pertanyaan tentang basis data', state: 'seed', source: 'demo', markdown: '# Pertanyaan tentang basis data\n\nApa perbedaan primary key dan foreign key?\n\nCatatan ini adalah contoh, bukan isi vault Anda.\n' },
]
