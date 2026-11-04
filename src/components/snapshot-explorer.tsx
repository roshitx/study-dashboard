import { useMemo, useState } from 'react'
import type { SnapshotIndex } from '@/domain/snapshot-index'
import { parseSnapshotConfig, prepareSnapshotSearch, searchSnapshot, type SnapshotConfig } from '@/domain/snapshot-navigation'
import { Button } from '@/components/ui/button'

export function SnapshotExplorer({ index }: { index: SnapshotIndex }) {
  const [source, setSource] = useState('{\n  "semesters": [],\n  "offerings": []\n}')
  const [config, setConfig] = useState<SnapshotConfig>({ semesters: [], offerings: [] })
  const [error, setError] = useState('')
  const [semester, setSemester] = useState('')
  const [offering, setOffering] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const searchable = useMemo(() => prepareSnapshotSearch(index, config), [index, config])
  const courses = config.offerings.filter(o => !semester || o.semesterId === semester)
  const ids = offering && offering !== '__unmapped' ? new Set([offering]) : semester ? new Set(courses.map(o => o.id)) : null
  const results = searchSnapshot(searchable, query, ids, offering === '__unmapped')
  const note = results.find(n => n.path === selected)
  return <section aria-labelledby="snapshot-explorer-title">
    <h3 id="snapshot-explorer-title">Jelajahi snapshot lokal</h3>
    <p>Sumber: snapshot · memori browser. Bukan data demo atau live. Konfigurasi hanya memetakan folder, tidak mengubah metadata sumber.</p>
    <details><summary>Konfigurasi semester dan offering (JSON)</summary>
      <p>Semester: id, number, academicPeriod (string/null), active. Offering: id, semesterId, courseCode, name, credits (angka/null), pathPrefix sesuai path indeks. Tidak ada semester atau SKS otomatis.</p>
      <pre className="whitespace-pre-wrap break-all">{'{"semesters":[{"id":"s3","number":3,"academicPeriod":null,"active":true}],"offerings":[{"id":"s3-course","semesterId":"s3","courseCode":"KODE","name":"Nama mata kuliah","credits":null,"pathPrefix":"University/Semester 3/Mata Kuliah"}]}'}</pre>
      <label htmlFor="snapshot-config">Konfigurasi snapshot</label>
      <textarea id="snapshot-config" value={source} onChange={e => setSource(e.target.value)} />
      <Button variant="outline" onClick={() => {
        try { const next = parseSnapshotConfig(source); setConfig(next); setError(''); setSemester(''); setOffering(''); setSelected('') }
        catch (e) { setError(e instanceof Error ? e.message : 'Konfigurasi invalid.') }
      }}>Terapkan konfigurasi</Button>
    </details>
    {error && <p role="alert">Konfigurasi gagal: {error} Konfigurasi valid sebelumnya tetap dipakai.</p>}
    <label htmlFor="snapshot-semester">Semester snapshot</label>
    <select id="snapshot-semester" className="w-full min-w-0 max-w-full" value={semester} onChange={e => { setSemester(e.target.value); setOffering(''); setSelected('') }}>
      <option value="">Semua semester / belum dipetakan</option>
      {config.semesters.map(s => <option key={s.id} value={s.id}>Semester {s.number} · Periode UT: {s.academicPeriod ?? 'belum dipetakan'}</option>)}
    </select>
    <label htmlFor="snapshot-offering">Mata kuliah snapshot</label>
    <select id="snapshot-offering" className="w-full min-w-0 max-w-full" value={offering} onChange={e => { setOffering(e.target.value); setSelected('') }}>
      <option value="">Semua mata kuliah</option>
      {!semester && <option value="__unmapped">Belum dipetakan</option>}
      {courses.map(o => <option key={o.id} value={o.id}>{o.courseCode} · {o.name} · {o.credits === null ? 'SKS belum dikonfirmasi' : `${o.credits} SKS`}</option>)}
    </select>
    <label htmlFor="snapshot-query">Cari path atau isi snapshot</label>
    <input id="snapshot-query" className="w-full min-w-0" type="search" value={query} onChange={e => { setQuery(e.target.value); setSelected('') }} />
    <p role="status">{results.length} catatan cocok dari {searchable.length} path snapshot.</p>
    {!results.length && <p>Tidak ada catatan sesuai filter. Periksa pencarian dan mapping folder; ini bukan error koneksi.</p>}
    <ul>{results.map(n => <li key={n.path}><Button variant="ghost" className="h-auto max-w-full whitespace-normal break-all text-left" onClick={() => setSelected(n.path)}>{n.path}{n.conflict ? ' · Konflik' : ''}{n.offeringId === null ? ' · Belum dipetakan' : ''}</Button></li>)}</ul>
    {note && <p className="path" role="status">Dipilih: {note.path}. {note.conflict ? 'Semua versi konflik tetap berada pada indeks.' : 'Bytes sumber tersimpan pada indeks.'} Reader/editor snapshot tersedia pada milestone berikutnya, bukan editor demo.</p>}
  </section>
}
