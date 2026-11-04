import { useEffect, useState } from 'react'
import type { IndexedNote } from '@/domain/snapshot-index'
import { draftBody, draftBytes } from '@/domain/snapshot-draft'
import { Button } from './ui/button'

export function SnapshotEditor({ note, onSave, onDirty }: { note: IndexedNote; onSave: (bytes: Uint8Array) => Promise<number>; onDirty: (dirty: boolean) => void }) {
  const [version, setVersion] = useState(0)
  const source = note.versions[version] ?? note.versions[0]!
  const [body, setBody] = useState(() => draftBody(source))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const dirty = body !== draftBody(source)
  useEffect(() => { onDirty(dirty); return () => onDirty(false) }, [dirty, onDirty])
  return <section data-snapshot-editor aria-label="Editor snapshot lokal">
    <h3>Draf snapshot · lokal</h3>
    <p>Hanya isi Markdown diedit. Frontmatter/BOM tetap utuh. Simpan menambah versi pada memori browser, bukan menimpa sumber. Export diperlukan sebelum meninggalkan sesi.</p>
    <label>Versi dasar<select className="w-full min-w-0 max-w-full" value={version} disabled={busy} onChange={e => {
      if (dirty && !window.confirm('Buang perubahan draf yang belum disimpan?')) return
      const next = Number(e.target.value); setVersion(next); setBody(draftBody(note.versions[next]!)); setMessage('')
    }}>{note.versions.map((v, i) => <option key={v.hash} value={i}>{v.hash}</option>)}</select></label>
    <label htmlFor="snapshot-draft">Isi Markdown snapshot</label>
    <textarea id="snapshot-draft" className="w-full min-h-64" spellCheck={false} disabled={busy} value={body} onChange={e => { setBody(e.target.value); setMessage('') }} />
    <p role="status">{dirty ? 'Draf belum disimpan.' : 'Tidak ada perubahan draf.'} {message}</p>
    <Button disabled={busy || !dirty} onClick={async () => {
      setBusy(true)
      try { const savedVersion = await onSave(draftBytes(source, body)); setVersion(savedVersion); setMessage('Versi baru disimpan ke memori lokal. Export untuk menyimpan ke disk.') }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Simpan lokal gagal; draf dipertahankan.') }
      finally { setBusy(false) }
    }}>Simpan versi ke memori lokal</Button>
    <Button variant="outline" disabled={busy || !dirty} onClick={() => { if (window.confirm('Buang perubahan draf yang belum disimpan?')) { setBody(draftBody(source)); setMessage('') } }}>Buang draf</Button>
  </section>
}
