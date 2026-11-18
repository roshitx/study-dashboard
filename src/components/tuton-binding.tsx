import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseAcademicMetadata, type AcademicMetadata } from '@/domain/metadata'
import type { TutonDetection } from '@/domain/tuton'
import { tutonStructure } from '@/domain/tuton-structure'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'

interface Stored { revision: number; metadata: AcademicMetadata }
export function TutonBinding({ spreadsheetId, sheetId, detected, onLoaded }: { spreadsheetId: string; sheetId: number; detected: TutonDetection; onLoaded?: (metadata: AcademicMetadata, savedSemesterId?: string) => void }) {
  const [stored, setStored] = useState<Stored | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded
  useEffect(() => {
    let active = true
    setBusy(true)
    void load(undefined, () => active).catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Konfigurasi belum dapat dibaca.') }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [spreadsheetId, sheetId])
  async function load(savedSemesterId?: string, isActive = () => true) {
    const response = await fetch('/api/metadata', { cache: 'no-store' })
    if (!response.ok) throw new Error('Metadata owner belum dapat dibaca. Masuk owner lalu coba lagi.')
    const value: unknown = await response.json()
    if (!value || typeof value !== 'object' || !('revision' in value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !('metadata' in value)) throw new Error('Respons metadata tidak valid.')
    const next = { revision: Number(value.revision), metadata: parseAcademicMetadata(value.metadata) }
    if (isActive()) {
      setStored(next); onLoadedRef.current?.(next.metadata, savedSemesterId)
      setSettingsOpen(!next.metadata.tutonBindings?.some(binding => binding.sheetId === sheetId && binding.spreadsheetId === spreadsheetId))
    }
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
        if (binding && (binding.sheetId !== sheetId || binding.sourceCourse !== sourceCourse || binding.spreadsheetId !== spreadsheetId)) throw new Error('Binding sumber offering berbeda atau identitas workbook belum terverifikasi; tidak ditimpa otomatis.')
        if (!binding) metadata.tutonBindings.push({ offeringId: offering.id, sheetId, sourceCourse, spreadsheetId, structure: tutonStructure(detected) })
        else { binding.spreadsheetId = spreadsheetId; binding.structure = tutonStructure(detected) }
      }
      parseAcademicMetadata(metadata)
      const response = await fetch('/api/metadata', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: stored.revision, metadata }) })
      if (response.status === 409) throw new Error('Konfigurasi berubah di tempat lain. Baca konfigurasi lagi sebelum simpan; isian tetap dipertahankan.')
      if (!response.ok) throw new Error('Penyimpanan gagal; konfigurasi belum dikonfirmasi.')
      await load(semester.id); setMessage('Hubungan tersimpan. Tracker semester di bawah siap digunakan; buka mata kuliah untuk melihat atau mengubah aktivitas.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Penyimpanan gagal.') }
    finally { setBusy(false) }
  }
  const linkedCount = stored?.metadata.tutonBindings?.filter(binding => binding.sheetId === sheetId && binding.spreadsheetId === spreadsheetId).length ?? 0
  return <><Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="rounded-md border p-3">
    <CollapsibleTrigger render={<Button variant="ghost" className="min-h-11 w-full justify-start whitespace-normal text-left" />}>{linkedCount ? `Hubungan semester · ${linkedCount} mata kuliah terhubung` : 'Hubungkan ke semester Anda'}{busy ? ' · Memuat…' : ''}</CollapsibleTrigger>
    <CollapsibleContent keepMounted>
      <section aria-label="Simpan hubungan akademik" className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Simpan hubungan mata kuliah dan kelas ke semester pribadi. Nilai tetap di Google Sheets; SKS dan kode BMP yang belum diketahui tetap kosong.</p>
        <Button variant="outline" disabled={busy} onClick={() => { setBusy(true); void load().then(() => setMessage('Konfigurasi terbaru dibaca.')).catch(e => setMessage(e.message)).finally(() => setBusy(false)) }}>Baca ulang konfigurasi</Button>
        {stored && <form onSubmit={e => { e.preventDefault(); void save(e.currentTarget) }}><FieldGroup>
          <Field><FieldLabel htmlFor={`semester-${sheetId}`}>Nomor semester pribadi</FieldLabel><Input id={`semester-${sheetId}`} name="semester" type="number" min={1} max={100} required /></Field>
          <Field><FieldLabel htmlFor={`period-${sheetId}`}>Periode akademik UT (opsional)</FieldLabel><Input id={`period-${sheetId}`} name="period" maxLength={64} /></Field>
          <Button type="submit" disabled={busy || !detected.courses.length || !detected.columns.length || !!detected.warnings.length}>Simpan hubungan semester</Button>
        </FieldGroup></form>}
      </section>
    </CollapsibleContent></Collapsible>{message && <p role="status" className="text-sm">{message}</p>}</>
}
