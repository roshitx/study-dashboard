import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseAcademicMetadata, type AcademicMetadata } from '@/domain/metadata'
import type { TutonDetection } from '@/domain/tuton'
import { tutonStructure } from '@/domain/tuton-structure'

interface Stored { revision: number; metadata: AcademicMetadata }
export function TutonBinding({ spreadsheetId, sheetId, detected, onLoaded }: { spreadsheetId: string; sheetId: number; detected: TutonDetection; onLoaded?: (metadata: AcademicMetadata) => void }) {
  const [stored, setStored] = useState<Stored | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function load() {
    const response = await fetch('/api/metadata', { cache: 'no-store' })
    if (!response.ok) throw new Error('Metadata owner belum dapat dibaca. Masuk owner lalu coba lagi.')
    const value: unknown = await response.json()
    if (!value || typeof value !== 'object' || !('revision' in value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !('metadata' in value)) throw new Error('Respons metadata tidak valid.')
    const next = { revision: Number(value.revision), metadata: parseAcademicMetadata(value.metadata) }
    setStored(next)
    onLoaded?.(next.metadata)
    return next
  }
  async function save(form: HTMLFormElement) {
    if (!stored) return
    const data = new FormData(form), semesterNumber = Number(data.get('semester')), academicPeriod = String(data.get('period') ?? '').trim() || null
    setBusy(true); setMessage('')
    try {
      if (!detected.courses.length || !detected.columns.length || detected.warnings.length) throw new Error('Deteksi belum lengkap; periksa warning sumber.')
      const metadata = structuredClone(stored.metadata)
      let semester = metadata.semesters.find(s => s.number === semesterNumber)
      if (semester && semester.academicPeriod !== academicPeriod) throw new Error('Periode semester tersimpan berbeda. Tidak diubah otomatis.')
      if (!semester) { semester = { id: crypto.randomUUID(), number: semesterNumber, academicPeriod, active: metadata.semesters.length === 0 }; metadata.semesters.push(semester) }
      metadata.tutonBindings ??= []
      for (const source of detected.courses) {
        let course = metadata.courses.find(c => c.courseCode === source.courseCode)
        if (!course) { course = { id: crypto.randomUUID(), courseCode: source.courseCode, sourceCourseCode: null, name: source.name || source.courseCode }; metadata.courses.push(course) }
        let offering = metadata.offerings.find(o => o.courseId === course.id && o.semesterId === semester.id)
        if (offering && offering.classId !== source.classId) throw new Error('Kelas offering tersimpan berbeda; simpan dibatalkan tanpa overwrite.')
        if (!offering) { offering = { id: crypto.randomUUID(), semesterId: semester.id, courseId: course.id, classId: source.classId, credits: null }; metadata.offerings.push(offering) }
        const sourceCourse = source.courseCode + (source.classId ? '.' + source.classId : '')
        const binding = metadata.tutonBindings.find(b => b.offeringId === offering.id)
        if (binding && (binding.sheetId !== sheetId || binding.sourceCourse !== sourceCourse || (binding.spreadsheetId && binding.spreadsheetId !== spreadsheetId))) throw new Error('Binding sumber offering berbeda; tidak ditimpa otomatis.')
        if (!binding) metadata.tutonBindings.push({ offeringId: offering.id, sheetId, sourceCourse, spreadsheetId, structure: tutonStructure(detected) })
        else { binding.spreadsheetId = spreadsheetId; binding.structure = tutonStructure(detected) }
      }
      parseAcademicMetadata(metadata)
      const response = await fetch('/api/metadata', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: stored.revision, metadata }) })
      if (response.status === 409) throw new Error('Konfigurasi berubah di tempat lain. Baca konfigurasi lagi sebelum simpan; isian tetap dipertahankan.')
      if (!response.ok) throw new Error('Penyimpanan gagal; konfigurasi belum dikonfirmasi.')
      await load(); setMessage('Semester, mata kuliah dan offering tersimpan. Tidak ada nilai sel atau isi catatan yang disalin.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Penyimpanan gagal.') }
    finally { setBusy(false) }
  }
  return <section aria-label="Simpan hubungan akademik" className="flex flex-col gap-3 rounded-md border p-3"><h4 className="font-medium">Hubungkan ke semester Anda</h4><p className="text-sm text-muted-foreground">Simpan eksplisit nama/kode mata kuliah, kelas, semester dan identitas worksheet di metadata privat D1. Tidak menyimpan nilai atau mengubah Google Sheets. SKS dan kode BMP belum diketahui tetap kosong.</p><Button variant="outline" disabled={busy} onClick={() => { setBusy(true); void load().then(() => setMessage('Konfigurasi terbaru dibaca.')).catch(e => setMessage(e.message)).finally(() => setBusy(false)) }}>Baca konfigurasi tersimpan</Button>{stored && <><p className="text-sm">Revisi {stored.revision} · {stored.metadata.tutonBindings?.filter(b => b.sheetId === sheetId).length ?? 0} offering terhubung worksheet ini.</p><form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); void save(e.currentTarget) }}><label className="text-sm">Nomor semester pribadi<Input name="semester" type="number" min={1} max={100} required /></label><label className="text-sm">Periode akademik UT (opsional)<Input name="period" maxLength={64} /></label><Button type="submit" disabled={busy || !detected.courses.length || !detected.columns.length || !!detected.warnings.length}>Simpan hubungan semester dan mata kuliah</Button></form></>}{message && <p role="status" className="text-sm">{message}</p>}</section>
}
