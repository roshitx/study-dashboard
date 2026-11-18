import { useEffect, useRef, useState, type FormEvent } from 'react'
import { VaultConflictError, VaultSession, VaultUncertainError } from '@/integrations/vault-client'
import { indexSnapshot, type SnapshotIndex } from '@/domain/snapshot-index'
import { SnapshotReader } from '@/components/snapshot-reader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useUnsavedDraft } from './owner-session'

type VaultObject = { key: string; path: string; size: number }
type LoadedFile = { key: string; path: string; bytes: Uint8Array; revision: string }

export function VaultReader() {
  const session = useRef<VaultSession | null>(null)
  const generation = useRef(0)
  const password = useRef<HTMLInputElement>(null)
  const [objects, setObjects] = useState<VaultObject[] | null>(null)
  const [index, setIndex] = useState<SnapshotIndex | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<LoadedFile | null>(null)
  const [draft, setDraft] = useState('')
  const [remote, setRemote] = useState<LoadedFile | null>(null)
  const [history, setHistory] = useState<{ id: string; revision: string }[] | null>(null)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [busy, setBusy] = useState<'unlock' | 'read' | 'save' | 'remote' | 'history' | 'recover' | null>(null)
  const [error, setError] = useState('')
  const dirty = loaded !== null && (needsRefresh || draft !== new TextDecoder().decode(loaded.bytes))
  useUnsavedDraft(dirty)

  useEffect(() => () => {
    generation.current++
    session.current?.lock()
    session.current = null
  }, [])

  useEffect(() => {
    if (!dirty) return
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    function beforeNavigate(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const element = event.target instanceof Element ? event.target : null
      if (!element || element.closest('[data-session-logout]')) return
      const control = element.closest('a[href],button')
      if (!control || control.closest('[aria-labelledby="vault-title"]') || (!(control instanceof HTMLAnchorElement) && !control.closest('nav'))) return
      if (control instanceof HTMLAnchorElement && (control.target === '_blank' || control.hasAttribute('download'))) return
      if (!window.confirm('Perubahan belum disimpan. Tinggalkan halaman ini?')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', beforeNavigate, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', beforeNavigate, true)
    }
  }, [dirty])

  function confirmDiscard() {
    return !dirty || window.confirm('Perubahan belum disimpan. Buang perubahan?')
  }

  function lock() {
    if (!confirmDiscard()) return
    generation.current++
    session.current?.lock()
    session.current = null
    if (password.current) password.current.value = ''
    setObjects(null)
    setIndex(null)
    setSelectedPath(null)
    setLoaded(null)
    setDraft('')
    setRemote(null)
    setHistory(null)
    setNeedsRefresh(false)
    setBusy(null)
    setError('')
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = password.current?.value ?? ''
    if (password.current) password.current.value = ''
    const current = ++generation.current
    session.current?.lock()
    const next = new VaultSession()
    session.current = next
    setBusy('unlock')
    setError('')
    try {
      const result = await next.unlock(value)
      if (generation.current !== current) return
      setObjects(result)
    } catch {
      if (generation.current !== current) return
      next.lock()
      session.current = null
      setError('Vault tidak dapat dibuka. Password mungkin salah, data rusak, atau layanan belum tersedia. Periksa konfigurasi dan coba lagi.')
    } finally {
      if (generation.current === current) setBusy(null)
    }
  }

  async function read(key: string) {
    const active = session.current
    if (!active || !confirmDiscard()) return
    const current = ++generation.current
    setBusy('read')
    setError('')
    try {
      const file = await active.read(key)
      if (generation.current !== current) return
      const result = await indexSnapshot([file], 'Vault uji', [])
      if (generation.current !== current) return
      setLoaded({ key, ...file })
      setDraft(new TextDecoder().decode(file.bytes))
      setIndex(result)
      setSelectedPath(result.notes[0]?.canonicalPath ?? null)
      setRemote(null)
      setHistory(null)
      setNeedsRefresh(false)
    } catch {
      if (generation.current === current) setError('Catatan tidak dapat dibaca. Data mungkin rusak atau layanan tidak tersedia. Coba lagi.')
    } finally {
      if (generation.current === current) setBusy(null)
    }
  }

  function mutationError(cause: unknown) {
    if (cause instanceof VaultConflictError) {
      setNeedsRefresh(true)
      setRemote(null)
      setError('Versi catatan telah berubah. Ambil versi terbaru sebelum mencoba lagi; draf tetap disimpan di sini.')
    } else if (cause instanceof VaultUncertainError) {
      setNeedsRefresh(true)
      setRemote(null)
      setError('Hasil penyimpanan tidak dapat dipastikan. Ambil versi terbaru dan periksa isinya sebelum mencoba lagi.')
    } else {
      setError('Perubahan tidak dapat disimpan. Draf tetap tersedia; coba lagi.')
    }
  }

  async function save() {
    const active = session.current
    if (!active || !loaded || needsRefresh) return
    const current = ++generation.current
    const bytes = new TextEncoder().encode(draft)
    setBusy('save')
    setError('')
    try {
      const result = await active.save(loaded.key, bytes, remote?.revision ?? loaded.revision)
      if (generation.current !== current) return
      setLoaded({ ...loaded, bytes, revision: result.revision })
      setRemote(null)
      setHistory(null)
      try {
        const updated = await indexSnapshot([{ path: loaded.path, bytes }], 'Vault uji', [])
        if (generation.current !== current) return
        setIndex(updated)
        setSelectedPath(updated.notes[0]?.canonicalPath ?? null)
      } catch {
        if (generation.current === current) setError('Catatan tersimpan, tetapi tampilan tidak dapat diperbarui. Buka kembali catatan untuk memperbaruinya.')
      }
    } catch (cause) {
      if (generation.current === current) mutationError(cause)
    } finally {
      if (generation.current === current) setBusy(null)
    }
  }

  async function fetchRemote() {
    const active = session.current
    if (!active || !loaded) return
    const current = ++generation.current
    setBusy('remote')
    setError('')
    try {
      const file = await active.read(loaded.key)
      if (generation.current !== current) return
      setRemote({ key: loaded.key, ...file })
      setNeedsRefresh(false)
    } catch {
      if (generation.current === current) setError('Versi terbaru tidak dapat dibaca. Draf tetap tersedia; coba lagi.')
    } finally {
      if (generation.current === current) setBusy(null)
    }
  }

  async function loadHistory() {
    const active = session.current
    if (!active || !loaded) return
    const current = ++generation.current
    setBusy('history')
    setError('')
    try {
      const entries = await active.history(loaded.key)
      if (generation.current === current) setHistory(entries)
    } catch {
      if (generation.current === current) setError('Riwayat tidak dapat dibaca. Coba lagi.')
    } finally {
      if (generation.current === current) setBusy(null)
    }
  }

  async function recover(id: string) {
    const active = session.current
    if (!active || !loaded || needsRefresh || !window.confirm('Pulihkan versi ini di vault? Draf saat ini tetap tersedia.')) return
    const current = ++generation.current
    setBusy('recover')
    setError('')
    try {
      const result = await active.recover(loaded.key, id, remote?.revision ?? loaded.revision)
      if (generation.current !== current) return
      setLoaded({ ...loaded, revision: result.revision })
      setRemote(null)
      setHistory(null)
      setNeedsRefresh(true)
      setError('Versi dipulihkan. Ambil versi terbaru untuk memeriksa hasil sebelum menyimpan draf.')
    } catch (cause) {
      if (generation.current === current) mutationError(cause)
    } finally {
      if (generation.current === current) setBusy(null)
    }
  }

  const markdown = objects?.filter(object => /\.md$/i.test(object.path)) ?? []
  const note = index?.notes.find(item => item.canonicalPath === selectedPath)
  return <Card className="min-w-0 max-w-full" role="region" aria-labelledby="vault-title">
    <CardHeader>
      <CardTitle><h2 id="vault-title">Vault uji</h2></CardTitle>
      <CardDescription>Baca dan edit catatan Markdown pada vault uji. Data terbuka hanya disimpan dalam memori selama sesi ini.</CardDescription>
    </CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-4">
      {objects === null ? <form onSubmit={event => void unlock(event)}>
        <FieldGroup><Field><FieldLabel htmlFor="vault-password">Password vault</FieldLabel><Input ref={password} id="vault-password" type="password" autoComplete="off" required disabled={busy !== null} /></Field>
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy !== null}>Buka vault uji</Button>{busy === 'unlock' && <Button type="button" variant="outline" onClick={lock}>Batal</Button>}</div>
        </FieldGroup>
      </form> : <>
        <div><Button variant="outline" onClick={lock}>Kunci vault</Button></div>
        {markdown.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada catatan Markdown dalam vault uji.</p> : <ul className="flex min-w-0 flex-col gap-2" aria-label="Catatan vault uji">{markdown.map(object => <li key={object.key}><Button variant="ghost" className="h-auto max-w-full justify-start whitespace-normal break-all" disabled={busy !== null} onClick={() => void read(object.key)}>{object.path}</Button></li>)}</ul>}
        {index && note && <SnapshotReader index={index} note={note} onNavigate={path => { if (confirmDiscard()) setSelectedPath(path) }} />}
        {loaded && <div className="flex min-w-0 flex-col gap-3">
          <Field><FieldLabel htmlFor="vault-draft">Edit {loaded.path}</FieldLabel><Textarea id="vault-draft" value={draft} onChange={event => setDraft(event.target.value)} disabled={busy !== null} rows={12} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy !== null || !dirty || needsRefresh} onClick={() => void save()}>{remote ? 'Simpan draf dengan versi terbaru' : 'Simpan'}</Button>
            <Button variant="outline" disabled={busy !== null} onClick={() => void fetchRemote()}>Ambil versi terbaru</Button>
            <Button variant="outline" disabled={busy !== null} onClick={() => void loadHistory()}>Riwayat</Button>
          </div>
          {remote && <Field><FieldLabel htmlFor="vault-remote">Versi terbaru di vault</FieldLabel><Textarea id="vault-remote" value={new TextDecoder().decode(remote.bytes)} readOnly rows={12} /></Field>}
          {history && <div><h3>Riwayat</h3>{history.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada riwayat.</p> : <ul>{history.map(entry => <li key={entry.id} className="flex flex-wrap items-center gap-2"><span className="break-all text-sm">{entry.id}</span><Button variant="outline" disabled={busy !== null || needsRefresh} onClick={() => void recover(entry.id)}>Pulihkan</Button></li>)}</ul>}</div>}
        </div>}
      </>}
      {busy && <p role="status" className="text-sm text-muted-foreground">{busy === 'unlock' ? 'Membuka vault uji…' : busy === 'save' ? 'Menyimpan catatan…' : busy === 'recover' ? 'Memulihkan catatan…' : busy === 'history' ? 'Memuat riwayat…' : 'Membaca catatan…'}</p>}
      {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
    </CardContent>
  </Card>
}
