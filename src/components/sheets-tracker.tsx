import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cellAt, cellValue, readMappedActivity, type SheetMapping, type Workbook } from '@/domain/sheets'
import { detectTuton, type TutonDetection } from '@/domain/tuton'
import { TutonBinding } from './tuton-binding'
import type { AcademicMetadata } from '@/domain/metadata'
import { resolveTutonOfferings } from '@/domain/tuton-binding'
import { TutonOfferingEditor } from './tuton-offering-editor'

export function SheetsTracker({ workbook, writeEnabled = false }: { workbook: Workbook; writeEnabled?: boolean }) {
  const [sheetId, setSheetId] = useState(workbook.sheets[0]?.properties.sheetId ?? -1)
  const [mappings, setMappings] = useState<SheetMapping[]>([])
  const [error, setError] = useState('')
  const [academic, setAcademic] = useState<AcademicMetadata | null>(null)
  const [selectedSemester, setSelectedSemester] = useState('')
  const sheet = workbook.sheets.find(s => s.properties.sheetId === sheetId)
  let detected: TutonDetection | null = null
  try { if (sheet) detected = detectTuton(sheet) } catch { detected = { courses: [], columns: [], warnings: ['Sel sumber error; deteksi diblokir sampai diperiksa.'] } }
  function add(form: HTMLFormElement) {
    const data = new FormData(form), text = (key: string) => String(data.get(key) ?? '').trim(), index = (key: string) => Number(text(key)) - 1
    try {
      if (!sheet) throw new Error('Worksheet tidak tersedia.')
      const headerRow = index('headerRow'), courseColumn = index('courseColumn'), row = index('row'), valueColumn = index('valueColumn')
      const courseHeader = cellValue(cellAt(sheet, headerRow, courseColumn)), valueHeader = cellValue(cellAt(sheet, headerRow, valueColumn)), sourceCourse = cellValue(cellAt(sheet, row, courseColumn))
      if (typeof courseHeader !== 'string' || typeof valueHeader !== 'string' || typeof sourceCourse !== 'string') throw new Error('Header dan identitas mata kuliah harus berupa teks. Periksa koordinat.')
      const mapping: SheetMapping = { spreadsheetId: workbook.spreadsheetId, sheetId, semesterId: text('semesterId'), offeringId: text('offeringId'), courseCode: text('courseCode'), classId: text('classId') || null, headerRow, courseColumn, courseHeader, row, sourceCourse, valueColumn, valueHeader, sessionNumber: Number(text('sessionNumber')), activity: text('activity') }
      readMappedActivity(workbook, mapping)
      if (mappings.some(m => m.semesterId === mapping.semesterId && m.offeringId === mapping.offeringId && m.sessionNumber === mapping.sessionNumber && m.activity === mapping.activity)) throw new Error('Aktivitas offering/sesi sudah dipetakan. Hapus mapping lama dahulu.')
      setMappings(previous => [...previous, mapping]); setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Mapping tidak valid.') }
  }
  return <section aria-label="Tracker Sheets live" className="flex min-w-0 flex-col gap-4">
    <h3 className="font-medium">{workbook.properties?.title ?? 'Workbook Google Sheets'}</h3>
    <p className="text-sm text-muted-foreground">Baca-saja. Mapping hanya di memori sesi ini; tidak mengubah Google Sheets. Nomor baris/kolom mulai dari 1. Semester dan offering memakai ID Anda, bukan nomor semester hardcode. Checkbox belum diklasifikasikan sebagai status pengumpulan.</p>
    <label className="flex flex-col gap-2 text-sm">Worksheet<select className="rounded-md border bg-background p-2" value={sheetId} onChange={e => setSheetId(Number(e.target.value))}>{workbook.sheets.map(s => <option key={s.properties.sheetId} value={s.properties.sheetId}>{s.properties.title ?? s.properties.sheetId} · {s.properties.sheetType ?? 'unknown'}</option>)}</select></label>
    {sheet?.properties.sheetType !== 'GRID' ? <p role="status">Worksheet {sheet?.properties.sheetType ?? 'unknown'} bukan tabel GRID. Dashboard/objek tidak tersedia sebagai baris tracker; buka worksheet GRID untuk memetakan aktivitas.</p> : <>
      <section aria-label="Preview Tuton otomatis" className="flex flex-col gap-3">
        <h4 className="font-medium">Tuton terdeteksi dari header</h4>
        <p className="text-sm text-muted-foreground">Preview sumber live, belum terikat semester/offering. Kelas dipisahkan dari kode registrasi. Checkbox hanya nilai sumber, bukan bukti submitted. Sel kosong/abu-abu tidak otomatis berarti tidak berlaku.</p>
        {detected?.warnings.map(warning => <p key={warning} role="status" className="text-sm">{warning}</p>)}
        {detected?.courses.map(course => <details key={course.row} className="rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">{course.courseCode} · {course.name}{course.classId ? ` · Kelas ${course.classId}` : ''}</summary><div className="mt-3 flex flex-col gap-2">{detected?.columns.map(column => { let value: string; try { const native = cellValue(cellAt(sheet, course.row, column.column)); value = native === null ? 'Belum ada nilai' : String(native) } catch { value = 'Error sel Google' }; return <p key={column.column} className="text-sm">Sesi {column.sessionNumber} · {column.activity}: <strong>{value}</strong>{column.dateLabel ? <span className="block text-muted-foreground">{column.dateLabel}</span> : null}</p> })}</div></details>)}
      </section>
      {detected && <TutonBinding spreadsheetId={workbook.spreadsheetId} sheetId={sheetId} detected={detected} onLoaded={metadata => { setAcademic(metadata); setSelectedSemester(current => metadata.semesters.some(s => s.id === current) ? current : metadata.semesters.find(s => s.active)?.id ?? metadata.semesters[0]?.id ?? '') }} />}
      {academic && detected && <section aria-label="Tracker semester tersimpan" className="flex flex-col gap-3"><h4 className="font-medium">Tracker semester tersimpan</h4><label className="flex flex-col gap-2 text-sm">Semester pribadi<select className="rounded-md border bg-background p-2" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>{academic.semesters.map(s => <option key={s.id} value={s.id}>Semester {s.number}{s.academicPeriod ? ` · ${s.academicPeriod}` : ''}</option>)}</select></label>{resolveTutonOfferings(academic, selectedSemester, sheetId, detected.courses).length === 0 && <p role="status" className="text-sm">Belum ada offering terhubung pada semester dan worksheet ini. Bukan berarti aktivitas kosong.</p>}{resolveTutonOfferings(academic, selectedSemester, sheetId, detected.courses).map(resolved => <section key={resolved.offeringId} className="border-t pt-3"><h5 className="text-sm font-medium">{resolved.source?.name ?? resolved.offeringId}{resolved.source?.classId ? ` · Kelas ${resolved.source.classId}` : ''}</h5>{resolved.error ? <p role="alert" className="text-sm text-destructive">{resolved.error}</p> : detected.columns.map(column => { let value: string; try { const native = cellValue(cellAt(sheet, resolved.source!.row, column.column)); value = native === null ? 'Belum ada nilai' : String(native) } catch { value = 'Error sel Google' }; return <p key={column.column} className="text-sm">Sesi {column.sessionNumber} · {column.activity}: <strong>{value}</strong></p> })}</section>)}</section>}
      {academic && detected && !detected.warnings.length && resolveTutonOfferings(academic, selectedSemester, sheetId, detected.courses).map(resolved => !resolved.error && resolved.source ? <TutonOfferingEditor key={resolved.offeringId} offeringId={resolved.offeringId} source={resolved.source} columns={detected.columns} sheet={sheet} enabled={writeEnabled && academic.tutonBindings?.some(b => b.offeringId === resolved.offeringId && b.spreadsheetId === workbook.spreadsheetId) === true} /> : null)}
      <section className="max-h-80 overflow-auto rounded-md border" tabIndex={0} aria-label="Sel sumber Google Sheets"><table className="w-full text-sm"><caption className="p-2 text-left">Sel sumber dengan koordinat asli; kosong berarti belum ada nilai. Formula memakai nilai efektif.</caption><thead><tr><th className="p-2 text-left">Baris</th><th className="p-2 text-left">Kolom dan nilai</th></tr></thead><tbody>{(sheet.data ?? []).flatMap((grid, gi) => (grid.rowData ?? []).map((row, ri) => <tr key={`${gi}:${ri}`} className="border-t"><th className="p-2 text-left align-top">{(grid.startRow ?? 0) + ri + 1}</th><td className="p-2">{(row.values ?? []).map((cell, ci) => { let value: string | number | boolean | null; try { value = cellValue(cell) } catch { value = '[Error sel Google]' }; return value === null ? null : <span key={ci} className="mr-4 inline-block break-all"><strong>{(grid.startColumn ?? 0) + ci + 1}:</strong> {String(value)}</span> })}</td></tr>))}</tbody></table></section>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); add(e.currentTarget) }}>
        {(['semesterId', 'offeringId', 'courseCode', 'classId', 'headerRow', 'courseColumn', 'row', 'valueColumn', 'sessionNumber', 'activity'] as const).map(key => <label key={key} className="flex flex-col gap-2 text-sm">{{ semesterId: 'ID semester', offeringId: 'ID offering', courseCode: 'Kode mata kuliah registrasi', classId: 'Kode kelas (opsional, terpisah)', headerRow: 'Baris header', courseColumn: 'Kolom identitas mata kuliah', row: 'Baris mata kuliah', valueColumn: 'Kolom aktivitas/nilai', sessionNumber: 'Nomor sesi Tuton (bukan modul)', activity: 'Nama aktivitas' }[key]}<Input name={key} required={key !== 'classId'} type={['headerRow', 'courseColumn', 'row', 'valueColumn', 'sessionNumber'].includes(key) ? 'number' : 'text'} min={1} maxLength={160} /></label>)}
        <Button type="submit" className="sm:col-span-2">Verifikasi dan tambahkan mapping</Button>
      </form>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {mappings.length > 0 && <section aria-label="Aktivitas terpetakan" className="flex flex-col gap-3"><h4 className="font-medium">Aktivitas terpetakan</h4>{mappings.map((mapping, i) => { let value: string; try { const result = readMappedActivity(workbook, mapping); value = result.value === null ? 'Belum ada nilai' : String(result.value) } catch { value = 'Mapping berubah atau sel error. Hapus lalu petakan ulang.' } return <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><div className="min-w-0 break-words text-sm"><p>{mapping.semesterId} · {mapping.offeringId} · {mapping.courseCode}{mapping.classId ? ` · Kelas ${mapping.classId}` : ''}</p><p>Sesi {mapping.sessionNumber} · {mapping.activity}: <strong>{value}</strong></p><p className="text-muted-foreground">Identitas sumber: {mapping.sourceCourse} · Header: {mapping.valueHeader}</p></div><Button variant="outline" onClick={() => setMappings(previous => previous.filter((_, index) => index !== i))}>Hapus mapping</Button></div> })}</section>}
  </section>
}
