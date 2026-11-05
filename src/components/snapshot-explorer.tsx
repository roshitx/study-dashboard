import { useMemo, useState } from 'react'
import type { SnapshotIndex } from '@/domain/snapshot-index'
import { parseSnapshotConfig, prepareSnapshotSearch, searchSnapshot, type SnapshotConfig } from '@/domain/snapshot-navigation'
import { Button } from '@/components/ui/button'
import { SnapshotReader } from './snapshot-reader'
import { SnapshotEditor } from './snapshot-editor'
import { SnapshotQueries } from './snapshot-queries'
import { FileSearch, Settings2 } from 'lucide-react'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import { SnapshotPractice } from './snapshot-practice'
export function SnapshotExplorer({ index, onSave, onDirty, dirty }: { index: SnapshotIndex; onSave: (path: string, bytes: Uint8Array) => Promise<number>; onDirty: (dirty: boolean) => void; dirty: boolean }) {
  const [source, setSource] = useState('{\n  "semesters": [],\n  "offerings": []\n}')
  const [config, setConfig] = useState<SnapshotConfig>({ semesters: [], offerings: [] })
  const [error, setError] = useState('')
  const [semester, setSemester] = useState('')
  const [offering, setOffering] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const [practicePath, setPracticePath] = useState('')
  const searchable = useMemo(() => prepareSnapshotSearch(index, config), [index, config])
  const courses = config.offerings.filter(o => !semester || o.semesterId === semester)
  const ids = offering && offering !== '__unmapped' ? new Set([offering]) : semester ? new Set(courses.map(o => o.id)) : null
  const results = searchSnapshot(searchable, query, ids, offering === '__unmapped')
  const note = index.notes.find(n => n.canonicalPath === selected)
  return <section className="flex min-w-0 flex-col gap-4" aria-labelledby="snapshot-explorer-title">
    <h3 id="snapshot-explorer-title">Jelajahi snapshot lokal</h3>
    <p>Sumber: snapshot · memori browser. Bukan data demo atau live. Konfigurasi hanya memetakan folder, tidak mengubah metadata sumber.</p>
    <SnapshotQueries index={index} onNavigate={setSelected} />
    <details><summary>Konfigurasi semester dan offering (JSON)</summary>
      <p>Semester: id, number, academicPeriod (string/null), active. Offering: id, semesterId, courseCode, name, credits (angka/null), pathPrefix sesuai path indeks. Tidak ada semester atau SKS otomatis.</p>
      <pre className="whitespace-pre-wrap break-all">{'{"semesters":[{"id":"s3","number":3,"academicPeriod":null,"active":true}],"offerings":[{"id":"s3-course","semesterId":"s3","courseCode":"KODE","name":"Nama mata kuliah","credits":null,"pathPrefix":"University/Semester 3/Mata Kuliah"}]}'}</pre>
      <FieldGroup><Field><FieldLabel htmlFor="snapshot-config">Konfigurasi snapshot</FieldLabel>
        <Textarea id="snapshot-config" value={source} onChange={e => setSource(e.target.value)} /></Field></FieldGroup>
      <Button variant="outline" onClick={() => {
        try { const next = parseSnapshotConfig(source); setConfig(next); setError(''); setSemester(''); setOffering(''); setSelected('') }
        catch (e) { setError(e instanceof Error ? e.message : 'Konfigurasi invalid.') }
      }}><Settings2 data-icon="inline-start" />Terapkan konfigurasi</Button>
    </details>
    {error && <Alert variant="destructive" role="alert"><AlertDescription>Konfigurasi gagal: {error} Konfigurasi valid sebelumnya tetap dipakai.</AlertDescription></Alert>}
    <FieldGroup>
      <Field><FieldLabel htmlFor="snapshot-semester">Semester snapshot</FieldLabel>
        <Select disabled={dirty} value={semester} onValueChange={value => { setSemester(value ?? ''); setOffering(''); setSelected('') }}>
          <SelectTrigger id="snapshot-semester" className="w-full min-w-0"><SelectValue placeholder="Semua semester / belum dipetakan" /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="">Semua semester / belum dipetakan</SelectItem>
            {config.semesters.map(s => <SelectItem key={s.id} value={s.id}>Semester {s.number} · Periode UT: {s.academicPeriod ?? 'belum dipetakan'}</SelectItem>)}
          </SelectGroup></SelectContent>
        </Select>
      </Field>
      <Field><FieldLabel htmlFor="snapshot-offering">Mata kuliah snapshot</FieldLabel>
        <Select disabled={dirty} value={offering} onValueChange={value => { setOffering(value ?? ''); setSelected('') }}>
          <SelectTrigger id="snapshot-offering" className="w-full min-w-0"><SelectValue placeholder="Semua mata kuliah" /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="">Semua mata kuliah</SelectItem>
            {!semester && <SelectItem value="__unmapped">Belum dipetakan</SelectItem>}
            {courses.map(o => <SelectItem key={o.id} value={o.id}>{o.courseCode} · {o.name} · {o.credits === null ? 'SKS belum dikonfirmasi' : `${o.credits} SKS`}</SelectItem>)}
          </SelectGroup></SelectContent>
        </Select>
      </Field>
      <Field><FieldLabel htmlFor="snapshot-query">Cari path atau isi snapshot</FieldLabel>
        <Input id="snapshot-query" disabled={dirty} className="w-full min-w-0" type="search" value={query} onChange={e => { setQuery(e.target.value); setSelected('') }} />
      </Field>
    </FieldGroup>
    <p role="status">{results.length} catatan cocok dari {searchable.length} path snapshot.</p>
    {!results.length && <Empty><EmptyHeader><EmptyMedia variant="icon"><FileSearch /></EmptyMedia><EmptyTitle>Tidak ada catatan sesuai filter</EmptyTitle><EmptyDescription>Periksa pencarian dan mapping folder; ini bukan error koneksi.</EmptyDescription></EmptyHeader></Empty>}
    <ul>{results.map(n => <li key={n.path}><Button variant="ghost" className="h-auto max-w-full whitespace-normal break-all text-left" onClick={() => setSelected(n.path)}>{n.path}{n.conflict ? ' · Konflik' : ''}{n.offeringId === null ? ' · Belum dipetakan' : ''}</Button></li>)}</ul>
    {note && practicePath !== note.canonicalPath && <Button className="min-h-11 self-start" variant="outline" disabled={dirty} onClick={() => setPracticePath(note.canonicalPath)}>Latihan dari catatan ini</Button>}
    {note && practicePath === note.canonicalPath ? <SnapshotPractice key={note.canonicalPath} note={note} onClose={() => setPracticePath('')} /> : note && <><SnapshotReader index={index} note={note} onNavigate={setSelected} /><SnapshotEditor key={note.canonicalPath} note={note} onSave={bytes => onSave(note.canonicalPath, bytes)} onDirty={onDirty} /></>}
  </section>
}