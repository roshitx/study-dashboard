import { useState } from 'react'
import { importLocalFiles, type ImportReport } from '@/integrations/local-import'
import { Button } from '@/components/ui/button'
import { indexSnapshot, type SnapshotIndex } from '@/domain/snapshot-index'

export function LocalImport() {
  const [report, setReport] = useState<ImportReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [root, setRoot] = useState('University')
  const [prefixes, setPrefixes] = useState('6 - Main Notes/Workspaces/University')
  const [index, setIndex] = useState<SnapshotIndex | null>(null)
  return <section className="card" aria-labelledby="import-title">
    <h2 id="import-title">Import snapshot lokal</h2>
    <p>File hanya dibaca di browser. Sumber tidak diubah atau diunggah. Snapshot belum masuk navigasi/editor demo.</p>
    <p>Markdown UTF-8 atau ZIP: maksimum 32 MiB input, 2.000 entri, 64 MiB ekstraksi, 2 MiB per file. Lampiran belum didukung.</p>
    <label htmlFor="canonical-root">Canonical root</label>
    <input id="canonical-root" className="w-full min-w-0" value={root} disabled={busy || !!report} onChange={e => setRoot(e.target.value)} />
    <label htmlFor="vault-prefixes">Prefix sumber yang dipetakan (satu per baris)</label>
    <textarea id="vault-prefixes" className="min-h-0 h-24" value={prefixes} disabled={busy || !!report} onChange={e => setPrefixes(e.target.value)} rows={2} />
    <label htmlFor="local-files">Pilih file Markdown atau ZIP</label>
    <input id="local-files" className="w-full min-w-0 max-w-full" type="file" accept=".md,.zip" multiple disabled={busy} onChange={async event => {
      const files = Array.from(event.currentTarget.files ?? [])
      event.currentTarget.value = ''
      if (!files.length) return
      setBusy(true); setError(''); setReport(null); setIndex(null)
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
        <Button variant="outline" onClick={() => { setReport(null); setIndex(null) }}>Tutup snapshot</Button>
        <details><summary>File diterima ({report.files.length})</summary><ul>{report.files.map((f, i) => <li key={i} className="path">{f.path} · {f.bytes.length} byte</li>)}</ul></details>
        {index && <>
          <p role="status">{index.notes.length} path unik; {index.duplicateCount} duplikat identik; {index.conflictCount} konflik.</p>
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
