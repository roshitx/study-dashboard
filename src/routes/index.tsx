import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { notes, offerings, semesters } from '../data/demo'
import { integrationStates } from '../integrations/contracts'
import { Button } from '@/components/ui/button'
import { LocalImport } from '@/components/local-import'

export const Route = createFileRoute('/')({ component: Dashboard })
function Dashboard() {
  const [semesterId, setSemesterId] = useState('demo-s2')
  const [tab, setTab] = useState<'today' | 'courses' | 'notes' | 'connections'>('today')
  const [selectedNote, setSelectedNote] = useState(notes[0].id)
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState(notes[0].markdown)
  const [message, setMessage] = useState('')
  const courseList = offerings.filter(c => c.semesterId === semesterId)
  const noteList = notes.filter(n => courseList.some(c => c.id === n.offeringId))
  function switchSemester(value: string) {
    if (selectedNote && draft !== (saved[selectedNote] ?? notes.find(n => n.id === selectedNote)?.markdown) && !window.confirm('Draf belum disimpan. Ganti semester?')) return
    setSemesterId(value)
    const next = notes.find(n => offerings.some(c => c.semesterId === value && c.id === n.offeringId))
    setSelectedNote(next?.id ?? ''); setDraft(next ? (saved[next.id] ?? next.markdown) : ''); setMessage('')
  }
  function selectNote(id: string) {
    if (selectedNote && draft !== (saved[selectedNote] ?? notes.find(n => n.id === selectedNote)?.markdown) && !window.confirm('Draf belum disimpan. Pindah catatan?')) return
    setSelectedNote(id); setDraft(saved[id] ?? notes.find(n => n.id === id)?.markdown ?? ''); setMessage('')
  }
  const note = noteList.find(n => n.id === selectedNote)
  return <div className="shell">
    <aside><a className="brand" href="/">UT<span>Study space</span></a><p className="eyebrow">RUANG BELAJAR PRIBADI</p>
      <nav aria-label="Navigasi utama">{([['today', 'Hari ini'], ['courses', 'Mata kuliah'], ['notes', 'Catatan'], ['connections', 'Koneksi']] as const).map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}</nav>
      <div className="aside-bottom"><span className="dot" /> Fondasi proyek · v0.1</div>
    </aside>
    <main><header><div><p className="eyebrow">UNIVERSITAS TERBUKA</p><h1>{tab === 'today' ? 'Ruang untuk fokus.' : tab === 'courses' ? 'Mata kuliah Anda.' : tab === 'notes' ? 'Baca. Pahami. Catat.' : 'Hubungkan ruang belajar.'}</h1></div>
      <label>Semester<select value={semesterId} onChange={e => switchSemester(e.target.value)}>{semesters.map(s => <option value={s.id} key={s.id}>Semester {s.number}{s.active ? ' · Aktif' : ''}</option>)}</select></label></header>
      <div className="banner"><strong>Mode demo sintetis</strong><span>Belum terhubung ke vault, Sheets, Calendar, atau AI. Simpan catatan hanya bertahan di memori halaman ini.</span></div>
      {tab === 'today' && <><section className="hero"><p className="eyebrow">MULAI DARI SATU LANGKAH</p><h2>Apa yang ingin Anda<br />pahami hari ini?</h2><p>Lanjutkan materi, tuliskan pertanyaan, lalu susun langkah belajar berikutnya.</p><Button variant="secondary" size="lg" onClick={() => setTab('notes')}>Buka catatan contoh</Button></section><div className="grid"><section className="card"><p className="eyebrow">AGENDA</p><h2>Belum ada agenda live</h2><p>Tenggat dan jadwal belajar akan muncul setelah sumber data terhubung.</p><button onClick={() => setTab('connections')}>Lihat koneksi</button></section><section className="card"><p className="eyebrow">SEMESTER TERPILIH</p><h2>{courseList.length} mata kuliah contoh</h2><p>Data ini memperagakan pemisahan antarsemester. Progres sebenarnya belum diimpor.</p><button onClick={() => setTab('courses')}>Lihat mata kuliah</button></section></div></>}
      {tab === 'courses' && <section className="grid">{courseList.map(c => <article className="card" key={c.id}><p className="eyebrow">{c.courseCode}</p><h2>{c.name}</h2><p>{c.credits === null ? 'SKS belum ditetapkan' : `${c.credits} SKS`} · data contoh</p><p>Status pengumpulan: belum diketahui</p><button onClick={() => { const n = noteList.find(n => n.offeringId === c.id); if (n) selectNote(n.id); setTab('notes') }}>Buka catatan</button></article>)}</section>}
      {tab === 'notes' && <LocalImport />}
      {tab === 'notes' && <section className="editor-layout"><div className="card"><h2>Catatan contoh</h2>{noteList.map(n => <button className="note-button" key={n.id} aria-pressed={n.id === selectedNote} onClick={() => selectNote(n.id)}>{n.title}</button>)}{!noteList.length && <p>Belum ada catatan contoh pada semester ini.</p>}</div><div className="card">{note ? <><p className="eyebrow">EDITOR MARKDOWN · MEMORI DEMO</p><h2>{note.title}</h2><p className="path">{note.path}</p><label htmlFor="markdown">Isi catatan</label><textarea id="markdown" spellCheck={false} value={draft} onChange={e => { setDraft(e.target.value); setMessage('') }} /><button className="primary" onClick={() => { setSaved({ ...saved, [note.id]: draft }); setMessage('Disimpan ke memori demo. Muat ulang halaman akan menghapus perubahan.') }}>Simpan ke memori demo</button><p role="status">{message}</p></> : <p>Pilih semester yang memiliki catatan contoh.</p>}</div></section>}
      {tab === 'connections' && <section className="grid">{Object.entries(integrationStates).map(([name, state]) => <article className="card" key={name}><p className="eyebrow">{name}</p><h2>Belum dikonfigurasi</h2><code>{state}</code><p>Kontrak integrasi tersedia untuk dikembangkan agent. Tidak ada koneksi atau operasi tulis eksternal pada starter.</p></article>)}</section>}
      <footer>Study Assistant UT · Bahasa Indonesia · Asia/Jakarta</footer>
    </main>
  </div>
}
