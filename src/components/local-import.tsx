import { useEffect, useState } from 'react'
import { importLocalFiles, type ImportReport } from '@/integrations/local-import'
import { Button } from '@/components/ui/button'
import { indexSnapshot, type SnapshotIndex } from '@/domain/snapshot-index'
import { SnapshotExplorer } from '@/components/snapshot-explorer'
import { exportSnapshotLayer } from '@/domain/snapshot-draft'

export function LocalImport() {
  const [report, setReport] = useState<ImportReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [root, setRoot] = useState('University')
  const [prefixes, setPrefixes] = useState('6 - Main Notes/Workspaces/University')
  const [index, setIndex] = useState<SnapshotIndex | null>(null)
  const [dirty, setDirty] = useState(false)
  const [unexported, setUnexported] = useState(false)
  const [exportedLayers, setExportedLayers] = useState<Set<number>>(new Set())
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty || unexported) { event.preventDefault(); event.returnValue = '' } }
    const navigate = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element) || target.closest('[data-snapshot-editor],[data-session-logout]')) return
      const control = target.closest('button,a,input,select,summary')
      if (!control) return
      const leaving = !target.closest('#import-workspace') || control.textContent === 'Tutup snapshot' || control.id === 'local-files'
      if ((dirty || (unexported && leaving)) && !window.confirm(dirty ? 'Draf belum disimpan. Lanjutkan dan buang draf?' : 'Versi lokal belum diexport. Tinggalkan snapshot?')) { event.preventDefault(); event.stopImmediatePropagation() }
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', navigate, true)
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true) }
  }, [dirty, unexported])
  return <section id="import-workspace" className="card min-w-0 max-w-full" aria-labelledby="import-title">
    <h2 id="import-title">Import snapshot lokal</h2>
    <p>File hanya dibaca di browser. Sumber tidak diubah atau diunggah. Snapshot belum masuk navigasi/editor demo.</p>
    <p>Markdown UTF-8 atau ZIP: maksimum 32 MiB input, 2.000 entri, 64 MiB ekstraksi, 2 MiB per file. Lampiran belum didukung.</p>
    <label htmlFor="canonical-root">Canonical root</label>
    <input id="canonical-root" className="w-full min-w-0" value={root} disabled={busy || !!report} onChange={e => setRoot(e.target.value)} />
    <label htmlFor="vault-prefixes">Prefix sumber yang dipetakan (satu per baris)</label>
    <textarea id="vault-prefixes" className="min-h-0 h-24" value={prefixes} disabled={busy || !!report} onChange={e => setPrefixes(e.target.value)} rows={2} />
    <label htmlFor="local-files">Pilih file Markdown atau ZIP</label>
    <input id="local-files" className="w-full min-w-0 max-w-full" type="file" accept=".md,.zip" multiple disabled={busy || dirty || unexported} onChange={async event => {
      const files = Array.from(event.currentTarget.files ?? [])
      event.currentTarget.value = ''
      if (!files.length) return
      setBusy(true); setError(''); setReport(null); setIndex(null); setDirty(false); setUnexported(false); setExportedLayers(new Set())
      try {
        const imported = await importLocalFiles(files)
        setIndex(await indexSnapshot(imported.files, root, prefixes.split('\n').map(p => p.trim()).filter(Boolean)))
        setReport(imported)
      }
      catch { setError('Import gagal. Pilih ulang file; sumber tetap tidak berubah.') }
      finally { setBusy(false) }
    }} />
    <p role="status">{busy ? 'Memproses snapshot lokal…' : report ? `${report.files.length} file diterima; ${report.diagnostics.length} diagnostic; ${report.entries} entri diperiksa.` : 'Belum ada snapshot dipilih.'}</p>
    {error && <p role="alert">{error}</p>}
    {
      report && <>
        <Button variant="outline" onClick={() => { setReport(null); setIndex(null); setDirty(false); setUnexported(false); setExportedLayers(new Set()) }}>Tutup snapshot</Button>
        <details><summary>File diterima ({report.files.length})</summary><ul>{report.files.map((f, i) => <li key={i} className="path">{f.path} · {f.bytes.length} byte</li>)}</ul></details>
        {index && <>
          <p role="status">{index.notes.length} path unik; {index.duplicateCount} duplikat identik; {index.conflictCount} konflik.</p>
          <p>Export ZIP lokal: unduh setiap lapisan versi, lalu pilih semua ZIP bersama saat import ulang agar konflik tetap lengkap. File sumber tidak ditimpa.</p>
          {Array.from({ length: Math.max(1, ...index.notes.map(n => n.versions.length)) }, (_, layer) => <Button key={layer} variant="outline" disabled={busy || dirty} onClick={async () => {
            setBusy(true); setError('')
            try {
              const blob = await exportSnapshotLayer(index, layer)
              if (blob.size > 32 * 1024 ** 2) throw new Error('ZIP melebihi batas import 32 MiB; export dibatalkan.')
              const url = URL.createObjectURL(blob); const link = document.createElement('a')
              link.href = url; link.download = `snapshot-versi-${layer + 1}.zip`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
              const next = new Set(exportedLayers).add(layer); setExportedLayers(next)
              if (next.size === Math.max(...index.notes.map(n => n.versions.length))) setUnexported(false)
            } catch (e) { setError(e instanceof Error ? e.message : 'Export gagal; versi lokal tetap dipertahankan.') }
            finally { setBusy(false) }
          }}>Export ZIP lokal · versi {layer + 1}{exportedLayers.has(layer) ? ' · diunduh' : ''}</Button>)}
          {unexported && <p role="status">Versi tersimpan hanya di memori; belum semua lapisan diexport.</p>}
          <SnapshotExplorer index={index} dirty={dirty} onDirty={setDirty} onSave={async (path, bytes) => {
            const added = await indexSnapshot([{ path, bytes }], root, [])
            const current = index.notes.find(note => note.canonicalPath === path)!
            const existing = current.versions.findIndex(version => version.hash === added.notes[0]!.versions[0]!.hash)
            setIndex(previous => {
              if (!previous) throw new Error('Snapshot sudah ditutup.')
              const notes = previous.notes.map(note => note.canonicalPath === path ? { ...note, versions: [...note.versions, ...added.notes[0]!.versions.filter(v => !note.versions.some(old => old.hash === v.hash))] } : note)
              return { ...previous, notes, conflictCount: notes.filter(n => n.versions.length > 1).length }
            })
            setUnexported(true); setExportedLayers(new Set())
            return existing < 0 ? current.versions.length : existing
          }} />
          <details><summary>Indeks dan metadata</summary>{index.notes.map(note => <article key={note.canonicalPath}>
            <h3 className="path">{note.canonicalPath}{note.versions.length > 1 ? ' · Konflik: semua versi dipertahankan' : ''}</h3>
            {note.versions.map(version => <div key={version.hash}>
              <p className="path">SHA-256: {version.hash}</p>
              <p className="path">Sumber: {version.sourcePaths.join(', ')}</p>
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(Object.fromEntries(version.properties), (_, value) => value instanceof Map ? Object.fromEntries(value) : value, 2)}</pre>
              {version.diagnostics.map((diagnostic, i) => <p key={i}>{diagnostic}</p>)}
            </div>)}
          </article>)}</details>
        </>}
        {!!report.diagnostics.length && <details open><summary>Diagnostic ({report.diagnostics.length})</summary><ul>{report.diagnostics.map((d, i) => <li key={i}><span className="path">{d.path}</span>: {d.reason}</li>)}</ul></details>}
      </>
    }
  </section>
}
