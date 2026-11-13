import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { SheetsTracker } from './sheets-tracker'
import { parseWorkbook } from '@/domain/sheets'

type Service = 'sheets' | 'calendar' | 'sheetsWrite'
interface ConnectionStatus { connected: { sheets: boolean; calendar: boolean; sheetsWrite: boolean }; configured: boolean; sheetConfigured: boolean }
export function GoogleConnection() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [readState, setReadState] = useState<'idle' | 'loading' | 'ready' | 'stale' | 'error'>('idle')
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  async function refresh() {
    const response = await fetch('/api/google/status', { cache: 'no-store' })
    if (!response.ok) throw new Error(response.status === 401 ? 'Masuk sebagai owner terlebih dahulu.' : 'Konfigurasi Google belum siap atau session owner tidak valid.')
    const value: unknown = await response.json()
    if (!value || typeof value !== 'object' || !('connected' in value) || !value.connected || typeof value.connected !== 'object' || !('sheets' in value.connected) || typeof value.connected.sheets !== 'boolean' || !('calendar' in value.connected) || typeof value.connected.calendar !== 'boolean' || !('configured' in value) || typeof value.configured !== 'boolean' || !('sheetConfigured' in value) || typeof value.sheetConfigured !== 'boolean') throw new Error('Respons koneksi tidak valid.')
    setStatus({ connected: { sheets: value.connected.sheets, calendar: value.connected.calendar, sheetsWrite: 'sheetsWrite' in value.connected && value.connected.sheetsWrite === true }, configured: value.configured, sheetConfigured: value.sheetConfigured })
  }
  useEffect(() => { void refresh().catch(e => setError(e instanceof Error ? e.message : 'Koneksi gagal.')) }, [])
  const connectedMessage = status?.connected.sheets ? `Grant baca Sheets tersimpan${status.connected.sheetsWrite ? '; grant edit juga tersimpan' : ''}. Akses Google saat ini belum diverifikasi. Klik Baca workbook live untuk menampilkan tracker; Hubungkan ulang hanya untuk memperbarui izin.` : null
  async function action(service: Service, kind: 'connect' | 'disconnect' | 'read') {
    setBusy(true); setError(''); if (kind !== 'read') setResult(null)
    if (kind === 'read') setReadState('loading')
    else { setReadState('idle'); setFetchedAt(null) }
    try {
      const response = await fetch(`/api/google/${kind}?service=${service}`, { method: kind === 'read' ? 'GET' : 'POST', cache: 'no-store' })
      const value: unknown = response.status === 204 ? null : await response.json()
      if (!response.ok) throw new Error(value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : 'Google tidak dapat diakses.')
      if (kind === 'connect') {
        if (!value || typeof value !== 'object' || !('authorizationUrl' in value) || typeof value.authorizationUrl !== 'string') throw new Error('Respons OAuth tidak valid.')
        const target = new URL(value.authorizationUrl)
        if (target.origin !== 'https://accounts.google.com') throw new Error('Tujuan OAuth tidak valid.')
        window.location.assign(target.href)
      } else if (kind === 'read') {
        if (!value || typeof value !== 'object' || !('source' in value) || value.source !== 'live' || !('fetchedAt' in value) || typeof value.fetchedAt !== 'string' || !Number.isFinite(Date.parse(value.fetchedAt))) throw new Error('Respons provider tidak valid.')
        if (service === 'sheets') {
          if (!value || typeof value !== 'object' || !('spreadsheet' in value)) throw new Error('Respons Sheets tidak valid.')
          parseWorkbook(value.spreadsheet)
        }
        setResult(value)
        setFetchedAt(value.fetchedAt); setReadState('ready')
      }
      else await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Koneksi gagal.')
      if (kind === 'read') setReadState(result === null ? 'error' : 'stale')
    }
    finally { setBusy(false) }
  }
  return <Card role="region" aria-label="Koneksi Google API"><CardHeader><CardTitle><h2>Google Sheets & Calendar</h2></CardTitle><CardDescription>Hubungkan akun owner langsung ke Google. Grant baca-saja terpisah dari login; token terenkripsi hanya di server. Tidak mengunggah catatan. Cabut akses dapat memutus kedua layanan.</CardDescription></CardHeader><CardContent className="flex min-w-0 flex-col gap-4">
    {error && <Alert variant="destructive"><AlertTitle>Koneksi belum siap</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {connectedMessage && <p role="status" className="text-sm">{connectedMessage}</p>}
    {!status && !error && <p role="status">Memeriksa koneksi Google…</p>}
    {(['sheets', 'calendar'] as const).map(service => <div key={service} className="flex flex-col gap-3 border-b pb-4"><h3 className="font-medium">{service === 'sheets' ? 'Google Sheets' : 'Google Calendar'}</h3><p className="text-sm text-muted-foreground">{status?.connected[service] ? 'Grant tersimpan; baca ulang untuk memverifikasi provider.' : 'Belum terhubung.'}{service === 'sheets' && status && !status.sheetConfigured ? ' Spreadsheet allowlist belum diisi pada GOOGLE_SHEET_ID server.' : ''}</p><div className="flex flex-wrap gap-2"><Button disabled={busy || !status?.configured} onClick={() => void action(service, 'connect')}>{status?.connected[service] ? 'Hubungkan ulang' : 'Hubungkan'} {service === 'sheets' ? 'Sheets' : 'Calendar'}</Button>{status?.connected[service] && <><Button variant="outline" disabled={busy} onClick={() => void action(service, 'read')}>{service === 'sheets' ? 'Baca workbook live' : 'Baca kalender live'}</Button><Button variant="outline" disabled={busy} onClick={() => { if (window.confirm('Cabut grant Google aplikasi? Google dapat membatalkan akses kedua layanan.')) void action(service, 'disconnect') }}>Cabut akses Google</Button></>}</div></div>)}
    <Button variant="outline" disabled={busy} onClick={() => { setError(''); void refresh().catch(e => setError(e instanceof Error ? e.message : 'Koneksi gagal.')) }}>Periksa ulang koneksi</Button>
    {busy && <p role="status">Menghubungi Google…</p>}
    <Button variant="outline" disabled={busy || !status?.configured} onClick={() => { if (window.confirm('Berikan aplikasi izin edit Google Sheets? Ini tidak langsung mengubah sel. Setiap update tetap memerlukan konfirmasi.')) void action('sheetsWrite', 'connect') }}>{status?.connected.sheetsWrite ? 'Perbarui izin edit Sheets' : 'Izinkan edit Sheets secara terpisah'}</Button>
    {result !== null && <p role="status" className="text-sm text-muted-foreground">{readState === 'stale' ? 'Data lama: pembacaan terbaru gagal. Hasil di bawah bukan kondisi terbaru Google.' : readState === 'loading' ? 'Memperbarui; hasil di bawah masih dari pembacaan sebelumnya.' : 'Data dari pembacaan Google terakhir.'}{fetchedAt ? ` Dibaca ${new Date(fetchedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.` : ''} Klik tombol baca layanan untuk memperbarui.</p>}
    {result !== null && <section aria-label="Hasil provider live"><h3 className="font-medium">Hasil Google live</h3>{typeof result === 'object' && 'spreadsheet' in result ? <SheetsTracker workbook={parseWorkbook(result.spreadsheet)} writeEnabled={status?.connected.sheetsWrite === true && readState === 'ready'} /> : <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(result, null, 2)}</pre>}</section>}
  </CardContent></Card>
}
