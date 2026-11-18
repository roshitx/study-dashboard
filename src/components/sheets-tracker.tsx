import { useState } from 'react'
import { cellAt, cellValue, type Workbook } from '@/domain/sheets'
import { detectTuton, type TutonDetection } from '@/domain/tuton'
import { TutonBinding } from './tuton-binding'
import type { AcademicMetadata } from '@/domain/metadata'
import { resolveTutonOfferings } from '@/domain/tuton-binding'
import { TutonOfferingEditor } from './tuton-offering-editor'

export function SheetsTracker({ workbook, writeEnabled = false }: { workbook: Workbook; writeEnabled?: boolean }) {
  const [sheetId, setSheetId] = useState(workbook.sheets[0]?.properties.sheetId ?? -1)
  const [academic, setAcademic] = useState<AcademicMetadata | null>(null)
  const [selectedSemester, setSelectedSemester] = useState('')
  const sheet = workbook.sheets.find(s => s.properties.sheetId === sheetId)
  let detected: TutonDetection | null = null
  try { if (sheet) detected = detectTuton(sheet) } catch { detected = { courses: [], columns: [], warnings: ['Sel sumber error; deteksi diblokir sampai diperiksa.'] } }
  return <section aria-label="Tracker Sheets live" className="flex min-w-0 flex-col gap-4">
    <h3 className="font-medium">{workbook.properties?.title ?? 'Workbook Google Sheets'}</h3>
    <p className="text-sm text-muted-foreground">Aktivitas dibaca otomatis dari worksheet. Hubungkan ke semester Anda untuk membuka tracker; perubahan Google Sheets memerlukan izin edit dan konfirmasi.</p>
    <label className="flex flex-col gap-2 text-sm">Worksheet<select className="rounded-md border bg-background p-2" value={sheetId} onChange={e => setSheetId(Number(e.target.value))}>{workbook.sheets.map(s => <option key={s.properties.sheetId} value={s.properties.sheetId}>{s.properties.title ?? s.properties.sheetId} · {s.properties.sheetType ?? 'unknown'}</option>)}</select></label>
    {sheet?.properties.sheetType !== 'GRID' ? <p role="status">Worksheet {sheet?.properties.sheetType ?? 'unknown'} bukan tabel GRID. Dashboard/objek tidak tersedia sebagai baris tracker; buka worksheet GRID untuk memetakan aktivitas.</p> : <>
      {detected?.warnings.map(warning => <p key={warning} role="alert" className="text-sm text-destructive">{warning}</p>)}
      <details className="rounded-md border p-3"><summary className="min-h-11 cursor-pointer content-center rounded-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Pratinjau deteksi · {detected?.courses.length ?? 0} mata kuliah</summary><section aria-label="Preview Tuton otomatis" className="mt-3 flex flex-col gap-3">
        <h4 className="font-medium">Tuton terdeteksi dari header</h4>
        <p className="text-sm text-muted-foreground">Preview sumber live, belum terikat semester/offering. Kelas dipisahkan dari kode registrasi. Checkbox hanya nilai sumber, bukan bukti submitted. Sel kosong/abu-abu tidak otomatis berarti tidak berlaku.</p>
        {detected?.warnings.map(warning => <p key={warning} role="status" className="text-sm">{warning}</p>)}
        {detected?.courses.map(course => <details key={course.row} className="rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">{course.courseCode} · {course.name}{course.classId ? ` · Kelas ${course.classId}` : ''}</summary><div className="mt-3 flex flex-col gap-2">{detected?.columns.map(column => { let value: string; try { const native = cellValue(cellAt(sheet, course.row, column.column)); value = native === null ? 'Belum ada nilai' : String(native) } catch { value = 'Error sel Google' }; return <p key={column.column} className="text-sm">Sesi {column.sessionNumber} · {column.activity}: <strong>{value}</strong>{column.dateLabel ? <span className="block text-muted-foreground">{column.dateLabel}</span> : null}</p> })}</div></details>)}
      </section></details>
      {detected && <TutonBinding key={`${workbook.spreadsheetId}:${sheetId}`} spreadsheetId={workbook.spreadsheetId} sheetId={sheetId} detected={detected} onLoaded={(metadata, savedSemesterId) => { setAcademic(metadata); setSelectedSemester(current => savedSemesterId ?? (metadata.semesters.some(s => s.id === current) ? current : metadata.semesters.find(s => s.active)?.id ?? metadata.semesters[0]?.id ?? '')) }} />}
      {academic && detected && <section aria-label="Tracker semester tersimpan" className="flex flex-col gap-3">
        <h4 className="font-medium">Tracker semester tersimpan</h4>
        <label className="flex flex-col gap-2 text-sm">Semester pribadi<select className="rounded-md border bg-background p-2" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>{academic.semesters.map(s => <option key={s.id} value={s.id}>Semester {s.number}{s.academicPeriod ? ` · ${s.academicPeriod}` : ''}</option>)}</select></label>
        {!writeEnabled && <p role="status" className="text-sm text-muted-foreground">Tracker siap dibaca. Untuk mengubah checkbox atau nilai, aktifkan izin edit Sheets di panel koneksi Google.</p>}
        {resolveTutonOfferings(academic, selectedSemester, sheetId, detected.courses).length === 0 && <p role="status" className="text-sm">Belum ada mata kuliah terhubung pada semester dan worksheet ini. Hubungkan semester di atas untuk mulai.</p>}
        {resolveTutonOfferings(academic, selectedSemester, sheetId, detected.courses).map(resolved => <details key={resolved.offeringId} className="rounded-md border p-3">
          <summary className="min-h-11 cursor-pointer content-center rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{resolved.source?.name ?? resolved.offeringId}{resolved.source?.classId ? ` · Kelas ${resolved.source.classId}` : ''}<span className="ml-2 text-muted-foreground">Buka aktivitas per sesi</span></summary>
          {resolved.error ? <p role="alert" className="text-sm text-destructive">{resolved.error}</p> : resolved.source && !detected.warnings.length ? <TutonOfferingEditor offeringId={resolved.offeringId} source={resolved.source} columns={detected.columns} sheet={sheet} enabled={writeEnabled && academic.tutonBindings?.some(b => b.offeringId === resolved.offeringId && b.spreadsheetId === workbook.spreadsheetId) === true} /> : <p role="status" className="text-sm">Periksa peringatan deteksi sumber sebelum membuka aktivitas.</p>}
        </details>)}
      </section>}
      <details><summary className="min-h-11 cursor-pointer content-center rounded-sm text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Periksa sel sumber Google Sheets</summary>
        <section className="max-h-80 overflow-auto rounded-md border" tabIndex={0} aria-label="Sel sumber Google Sheets"><table className="w-full text-sm"><caption className="p-2 text-left">Sel sumber dengan koordinat asli; kosong berarti belum ada nilai. Formula memakai nilai efektif.</caption><thead><tr><th className="p-2 text-left">Baris</th><th className="p-2 text-left">Kolom dan nilai</th></tr></thead><tbody>{(sheet.data ?? []).flatMap((grid, gi) => (grid.rowData ?? []).map((row, ri) => <tr key={`${gi}:${ri}`} className="border-t"><th className="p-2 text-left align-top">{(grid.startRow ?? 0) + ri + 1}</th><td className="p-2">{(row.values ?? []).map((cell, ci) => { let value: string | number | boolean | null; try { value = cellValue(cell) } catch { value = '[Error sel Google]' }; return value === null ? null : <span key={ci} className="mr-4 inline-block break-all"><strong>{(grid.startColumn ?? 0) + ci + 1}:</strong> {String(value)}</span> })}</td></tr>))}</tbody></table></section>
      </details>
    </>}
  </section>
}
