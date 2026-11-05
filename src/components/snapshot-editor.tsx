import { useEffect, useState } from 'react'
import type { IndexedNote } from '@/domain/snapshot-index'
import { draftBody, draftBytes } from '@/domain/snapshot-draft'
import { Button } from './ui/button'
import { Save, Trash2 } from 'lucide-react'
import { Field, FieldGroup, FieldLabel } from './ui/field'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export function SnapshotEditor({ note, onSave, onDirty }: { note: IndexedNote; onSave: (bytes: Uint8Array) => Promise<number>; onDirty: (dirty: boolean) => void }) {
  const [version, setVersion] = useState(0)
  const source = note.versions[version] ?? note.versions[0]!
  const [body, setBody] = useState(() => draftBody(source))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const dirty = body !== draftBody(source)
  useEffect(() => { onDirty(dirty); return () => onDirty(false) }, [dirty, onDirty])
  return <section data-snapshot-editor aria-label="Editor snapshot lokal" className="flex min-w-0 flex-col gap-4">
    <h3>Draf snapshot · lokal</h3>
    <p>Hanya isi Markdown diedit. Frontmatter/BOM tetap utuh. Simpan menambah versi pada memori browser, bukan menimpa sumber. Export diperlukan sebelum meninggalkan sesi.</p>
    <FieldGroup>
      <Field><FieldLabel htmlFor="snapshot-base-version">Versi dasar</FieldLabel><Select items={note.versions.map((v, i) => ({ value: String(i), label: `Versi ${i + 1} · ${v.hash.slice(0, 12)}` }))} value={String(version)} disabled={busy} onValueChange={value => {
        if (value === null || (dirty && !window.confirm('Buang perubahan draf yang belum disimpan?'))) return
        const next = Number(value); setVersion(next); setBody(draftBody(note.versions[next]!)); setMessage('')
      }}><SelectTrigger id="snapshot-base-version" className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent data-snapshot-editor><SelectGroup>{note.versions.map((v, i) => <SelectItem key={v.hash} value={String(i)}>Versi {i + 1} · {v.hash.slice(0, 12)}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
      <Field><FieldLabel htmlFor="snapshot-draft">Isi Markdown snapshot</FieldLabel>
        <Textarea id="snapshot-draft" className="w-full min-h-64" spellCheck={false} disabled={busy} value={body} onChange={e => { setBody(e.target.value); setMessage('') }} /></Field>
    </FieldGroup>
    <p role="status">{dirty ? 'Draf belum disimpan.' : 'Tidak ada perubahan draf.'} {message}</p>
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !dirty} onClick={async () => {
      setBusy(true)
      try { const savedVersion = await onSave(draftBytes(source, body)); setVersion(savedVersion); setMessage('Versi baru disimpan ke memori lokal. Export untuk menyimpan ke disk.') }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Simpan lokal gagal; draf dipertahankan.') }
      finally { setBusy(false) }
    }}><Save data-icon="inline-start" />Simpan versi ke memori lokal</Button>
      <Button variant="outline" disabled={busy || !dirty} onClick={() => { if (window.confirm('Buang perubahan draf yang belum disimpan?')) { setBody(draftBody(source)); setMessage('') } }}><Trash2 data-icon="inline-start" />Buang draf</Button></div>
  </section>
}
