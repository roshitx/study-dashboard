import type { IndexedNote, SnapshotIndex } from '@/domain/snapshot-index'
import { runSnapshotQuery, snapshotReport } from '@/domain/snapshot-query'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

export function SnapshotQuery({ index, note, source, onNavigate }: { index: SnapshotIndex; note: IndexedNote; source: string; onNavigate: (path: string) => void }) {
  const result = runSnapshotQuery(index, note, source)
  return <section aria-label="Hasil query lokal"><p>Query aplikasi lokal · semua versi konflik disertakan.</p>
    {result.error ? <Alert role="note"><AlertDescription>DQL tidak didukung: {result.error} Sumber tetap dipertahankan.</AlertDescription></Alert> : <><p>{result.rows.length} baris hasil.</p><Table><TableHeader><TableRow>{result.columns.map((column, i) => <TableHead key={i}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{result.rows.map(row => <TableRow key={row.path + row.hash}>{row.values.map((value, i) => <TableCell key={i}>{typeof value === 'string' && value === row.path ? <Button variant="link" className="h-auto whitespace-normal break-all" onClick={() => onNavigate(row.path)}>{value}</Button> : value == null ? 'null' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</TableCell>)}</TableRow>)}</TableBody></Table></>}
    <details><summary>Sumber DQL asli (tidak diubah)</summary><pre className="whitespace-pre-wrap break-all">{source}</pre></details>
  </section>
}

export function SnapshotQueries({ index, onNavigate }: { index: SnapshotIndex; onNavigate: (path: string) => void }) {
  const report = snapshotReport(index)
  const current = index.notes[0]
  return <section className="flex min-w-0 flex-col gap-3" aria-label="Ringkasan dan query snapshot"><h3>Ringkasan snapshot aktual</h3>
    <p>{report.notes} catatan · {report.hubs} Course Hub · {report.versions} versi · {report.duplicates} duplikat identik · {report.conflicts} konflik.</p>
    <p>{report.metadataFailures} versi dengan diagnostic metadata; {report.queries} DQL; {report.queryFailures} query tidak didukung/gagal parse. Checkbox tidak diproyeksikan menjadi task.</p>
    {current && <><h4>Recently Updated</h4><SnapshotQuery index={index} note={current} source={'TABLE file.link as Note, updated\nSORT updated DESC\nLIMIT 20'} onNavigate={onNavigate} />
      <h4>Missing-related</h4><SnapshotQuery index={index} note={current} source={'TABLE file.link as Note, updated\nWHERE length(related) = 0\nSORT updated DESC'} onNavigate={onNavigate} />
      <p>Missing-related berarti property related kosong/tidak ada; metadata ambigu tidak diperbaiki otomatis. Ini bukan bukti semua tautan rusak.</p></>}
  </section>
}
