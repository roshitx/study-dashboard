import { cellAt, cellValue, type Sheet } from './sheets'

export interface TutonCourse { row: number; courseCode: string; classId: string | null; name: string }
export interface TutonColumn { column: number; sessionNumber: number; activity: string; dateLabel: string | null }
export interface TutonDetection { courses: TutonCourse[]; columns: TutonColumn[]; warnings: string[] }
export function detectTuton(sheet: Sheet): TutonDetection {
  if (sheet.properties.sheetType !== 'GRID') return { courses: [], columns: [], warnings: ['Worksheet bukan GRID.'] }
  const text = (row: number, column: number) => { const value = cellValue(cellAt(sheet, row, column)); return typeof value === 'string' ? value.trim() : '' }
  const coordinates = new Map<number, Set<number>>()
  for (const grid of sheet.data ?? []) for (const [ri, row] of (grid.rowData ?? []).entries()) {
    const r = (grid.startRow ?? 0) + ri
    let columns = coordinates.get(r); if (!columns) { columns = new Set(); coordinates.set(r, columns) }
    for (let ci = 0; ci < (row.values?.length ?? 0); ci++) columns.add((grid.startColumn ?? 0) + ci)
  }
  const headers: { row: number; code: number; name: number }[] = []
  for (const [row, columns] of coordinates) {
    const code = [...columns].filter(c => /^kode(?: mata kuliah)?$/i.test(text(row, c)))
    const name = [...columns].filter(c => /^nama mata kuliah$/i.test(text(row, c)))
    if (code.length === 1 && name.length === 1) headers.push({ row, code: code[0]!, name: name[0]! })
  }
  if (headers.length !== 1) return { courses: [], columns: [], warnings: ['Header Kode/Nama Mata Kuliah tidak unik; perlu review struktur sumber.'] }
  const header = headers[0]!, courses: TutonCourse[] = [], columns: TutonColumn[] = [], warnings: string[] = []
  const sessions: { row: number; column: number; session: number }[] = []
  for (const [row, cols] of coordinates) for (const column of cols) {
    const match = /^sesi\s+(\d+)$/i.exec(text(row, column))
    if (match && row >= header.row && row <= header.row + 3) sessions.push({ row, column, session: Number(match[1]) })
  }
  sessions.sort((a, b) => a.column - b.column)
  for (const [row] of coordinates) {
    if (row <= header.row) continue
    const match = /^([A-Z]{4}\d{4})(?:\.([A-Za-z0-9_-]+))?$/.exec(text(row, header.code))
    if (match) courses.push({ row, courseCode: match[1]!, classId: match[2] ?? null, name: text(row, header.name) })
  }
  const firstCourse = courses.length ? Math.min(...courses.map(c => c.row)) : Infinity
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]!, end = sessions[i + 1]?.column ?? Infinity
    for (const [row, cols] of coordinates) {
      if (row <= session.row || row >= firstCourse) continue
      for (const column of cols) {
        if (column < session.column || column >= end) continue
        const label = text(row, column)
        if (!/^(?:baca modul|presensi|diskusi(?:\s+\d+)?|tugas(?:\s+\d+)?|nilai)$/i.test(label)) continue
        const dates = text(session.row + 1, session.column)
        columns.push({ column, sessionNumber: session.session, activity: label, dateLabel: dates && !/^(?:baca modul|presensi|diskusi|tugas|nilai)/i.test(dates) ? dates : null })
      }
    }
  }
  if (!courses.length) warnings.push('Kode mata kuliah belum dikenali.')
  if (!columns.length) warnings.push('Kelompok sesi/aktivitas belum dikenali.')
  if (new Set(sessions.map(s => s.session)).size !== sessions.length) { columns.length = 0; warnings.push('Nomor sesi berulang; deteksi aktivitas diblokir sampai sumber ditinjau.') }
  return { courses, columns, warnings }
}
