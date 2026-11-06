import { useEffect, useRef, useState, type FormEvent } from 'react'
import { VaultSession } from '@/integrations/vault-client'
import { indexSnapshot, type SnapshotIndex } from '@/domain/snapshot-index'
import { SnapshotReader } from '@/components/snapshot-reader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type VaultObject = { key: string; path: string; size: number }

export function VaultReader() {
  const session = useRef<VaultSession | null>(null)
  const generation = useRef(0)
  const password = useRef<HTMLInputElement>(null)
  const [objects, setObjects] = useState<VaultObject[] | null>(null)
  const [index, setIndex] = useState<SnapshotIndex | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [busy, setBusy] = useState<'unlock' | 'read' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => () => {
    generation.current++
    session.current?.lock()
    session.current = null
  }, [])

  function lock() {
    generation.current++
    session.current?.lock()
    session.current = null
    if (password.current) password.current.value = ''
    setObjects(null)
    setIndex(null)
    setSelectedPath(null)
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
    if (!active) return
    const current = ++generation.current
    setIndex(null)
    setSelectedPath(null)
    setBusy('read')
    setError('')
    try {
      const file = await active.read(key)
      if (generation.current !== current) return
      const result = await indexSnapshot([file], 'Vault uji', [])
      if (generation.current !== current) return
      setIndex(result)
      setSelectedPath(result.notes[0]?.canonicalPath ?? null)
    } catch {
      if (generation.current === current) setError('Catatan tidak dapat dibaca. Data mungkin rusak atau layanan tidak tersedia. Coba lagi.')
    } finally {
      if (generation.current === current) setBusy(null)
    }
  }

  const markdown = objects?.filter(object => /\.md$/i.test(object.path)) ?? []
  const note = index?.notes.find(item => item.canonicalPath === selectedPath)
  return <Card className="min-w-0 max-w-full" role="region" aria-labelledby="vault-title">
    <CardHeader>
      <CardTitle><h2 id="vault-title">Vault uji</h2></CardTitle>
      <CardDescription>Baca catatan Markdown dari vault uji. Sumber tidak diubah; data terbuka hanya disimpan dalam memori selama sesi ini.</CardDescription>
    </CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-4">
      {objects === null ? <form onSubmit={event => void unlock(event)}>
        <FieldGroup><Field><FieldLabel htmlFor="vault-password">Password vault</FieldLabel><Input ref={password} id="vault-password" type="password" autoComplete="off" required disabled={busy !== null} /></Field>
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy !== null}>Buka vault uji</Button>{busy === 'unlock' && <Button type="button" variant="outline" onClick={lock}>Batal</Button>}</div>
        </FieldGroup>
      </form> : <>
        <div><Button variant="outline" onClick={lock}>Kunci vault</Button></div>
        {markdown.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada catatan Markdown dalam vault uji.</p> : <ul className="flex min-w-0 flex-col gap-2" aria-label="Catatan vault uji">{markdown.map(object => <li key={object.key}><Button variant="ghost" className="h-auto max-w-full justify-start whitespace-normal break-all" disabled={busy !== null} onClick={() => void read(object.key)}>{object.path}</Button></li>)}</ul>}
        {index && note && <SnapshotReader index={index} note={note} onNavigate={setSelectedPath} />}
      </>}
      {busy && <p role="status" className="text-sm text-muted-foreground">{busy === 'unlock' ? 'Membuka vault uji…' : 'Membaca catatan…'}</p>}
      {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
    </CardContent>
  </Card>
}
