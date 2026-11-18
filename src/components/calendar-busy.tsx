import { useState } from 'react'
import { calendarWindow, calendarBusy, type CalendarEntry, type BusyRange } from '@/domain/calendar'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export function CalendarBusy({ calendars }: { calendars: CalendarEntry[] }) {
  const [calendarId, setCalendarId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [result, setResult] = useState<{ busy: BusyRange[]; fetchedAt: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const clear = () => { setResult(null); setError('') }
  async function read() {
    setLoading(true); clear()
    try {
      const window = calendarWindow(start, end)
      const params = new URLSearchParams({ service: 'calendar', calendarId, start, end })
      const response = await fetch('/api/google/read?' + params, { cache: 'no-store' })
      const payload: unknown = await response.json()
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Respons waktu sibuk tidak valid.')
      const value = payload as Record<string, unknown>
      if (!response.ok) throw new Error(value.error === 'calendar_consent_required' || value.error === 'provider_access_denied' ? 'Izin waktu sibuk belum tersedia. Buka pengaturan koneksi lalu pilih Hubungkan ulang Calendar secara eksplisit.' : value.error === 'calendar_unavailable' ? 'Kalender gagal dibaca; rentang ini tidak dianggap bebas.' : 'Pembacaan waktu sibuk gagal; coba baca ulang. ' + (typeof value.error === 'string' ? value.error : ''))
      if (value.source !== 'live' || value.calendarId !== calendarId || value.timeZone !== 'Asia/Jakarta' || typeof value.fetchedAt !== 'string' || !Number.isFinite(Date.parse(value.fetchedAt))) throw new Error('Respons waktu sibuk tidak valid.')
      setResult({ busy: calendarBusy({ ...value, calendars: { [calendarId]: { busy: value.busy } } }, calendarId, window), fetchedAt: value.fetchedAt })
    } catch (error) { setError(error instanceof Error && error.message === 'invalid_input' ? 'Pilih rentang tanggal valid, maksimal 31 hari.' : error instanceof Error ? error.message : 'Pembacaan gagal.') }
    finally { setLoading(false) }
  }
  const format = (value: string) => new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })
  return <section aria-label="Waktu sibuk kalender" className="flex flex-col gap-4">
    <h4 className="font-medium">Baca waktu sibuk kalender</h4>
    <p className="text-sm text-muted-foreground">Hanya interval sibuk, tanpa judul atau detail event. Tidak membuat event atau rencana belajar.</p>
    {!calendars.length ? <p role="status">Tidak ada kalender yang tersedia.</p> : <form onSubmit={event => { event.preventDefault(); void read() }}><FieldGroup>
      <Field><FieldLabel htmlFor="busy-calendar">Kalender pilihan</FieldLabel><Select value={calendarId} disabled={loading} onValueChange={value => { setCalendarId(value ?? ''); clear() }} items={calendars.map(calendar => ({ value: calendar.id, label: calendar.name }))}><SelectTrigger id="busy-calendar"><SelectValue placeholder="Pilih kalender" /></SelectTrigger><SelectContent><SelectGroup>{calendars.map(calendar => <SelectItem key={calendar.id} value={calendar.id}>{calendar.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
      <Field><FieldLabel htmlFor="busy-start">Tanggal mulai (WIB)</FieldLabel><Input id="busy-start" type="date" required disabled={loading} value={start} onChange={event => { setStart(event.target.value); clear() }} /></Field>
      <Field><FieldLabel htmlFor="busy-end">Tanggal akhir, tidak termasuk (WIB)</FieldLabel><Input id="busy-end" type="date" required disabled={loading} value={end} onChange={event => { setEnd(event.target.value); clear() }} /><FieldDescription>Maksimal 31 hari. Contoh: 18–19 November membaca seluruh tanggal 18 November dalam Asia/Jakarta.</FieldDescription></Field>
      <Button type="submit" disabled={loading || !calendarId || !start || !end}>{loading ? 'Membaca waktu sibuk…' : 'Baca waktu sibuk'}</Button>
    </FieldGroup></form>}
    {error && <Alert variant="destructive"><AlertTitle>Waktu sibuk belum tersedia</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {result && <div role="status" className="flex flex-col gap-2"><p className="text-sm text-muted-foreground">Dibaca {format(result.fetchedAt)} WIB. Hasil hanya untuk kalender pilihan, bukan seluruh kalender Anda.</p>{result.busy.length ? <ul className="flex flex-col gap-2">{result.busy.map(range => <li key={range.start}>{format(range.start)} – {format(range.end)} WIB</li>)}</ul> : <p>Tidak ada interval sibuk pada kalender dan rentang pilihan.</p>}</div>}
  </section>
}
