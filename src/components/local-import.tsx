import { useState } from 'react'
import { importLocalFiles, type ImportReport } from '@/integrations/local-import'
import { Button } from '@/components/ui/button'

export function LocalImport() {
  const [report, setReport] = useState<ImportReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <section className="card" aria-labelledby="import-title">
    <h2 id="import-title">Import snapshot lokal</h2>
    <p>File hanya dibaca di browser. Sumber tidak diubah atau diunggah. Snapshot belum masuk navigasi/editor demo.</p>
    <p>Markdown UTF-8 atau ZIP: maksimum 32 MiB input, 2.000 entri, 64 MiB ekstraksi, 2 MiB per file. Lampiran belum didukung.</p>
    <label htmlFor="local-files">Pilih file Markdown atau ZIP</label>
    <input id="local-files" className="w-full min-w-0 max-w-full" type="file" accept=".md,.zip" multiple disabled={busy} onChange={async event => {
      const files = Array.from(event.currentTarget.files ?? [])
      event.currentTarget.value = ''
      if (!files.length) return
      setBusy(true); setError(''); setReport(null)
      try { setReport(await importLocalFiles(files)) }
      catch { setError('Import gagal. Pilih ulang file; sumber tetap tidak berubah.') }
      finally { setBusy(false) }
    }} />
    <p role="status">{busy ? 'Memproses snapshot lokal…' : report ? `${report.files.length} file diterima; ${report.diagnostics.length} diagnostic; ${report.entries} entri diperiksa.` : 'Belum ada snapshot dipilih.'}</p>
    {error && <p role="alert">{error}</p>}
    {
      report && <>
        <Button variant="outline" onClick={() => setReport(null)}>Tutup snapshot</Button>
        <details><summary>File diterima ({report.files.length})</summary><ul>{report.files.map((f, i) => <li key={i} className="path">{f.path} · {f.bytes.length} byte</li>)}</ul></details>
        {!!report.diagnostics.length && <details open><summary>Diagnostic ({report.diagnostics.length})</summary><ul>{report.diagnostics.map((d, i) => <li key={i}><span className="path">{d.path}</span>: {d.reason}</li>)}</ul></details>}
      </>
    }
  </section>
}
