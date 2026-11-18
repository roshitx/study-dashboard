import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUnsavedDraft } from './owner-session'

type CellValue = boolean | number | null
type Receipt = { operationId: string; status: 'pending' | 'confirmed' | 'rejected' | 'uncertain'; code?: string; value?: CellValue }

function parseReceipt(data: unknown, operationId: string): Receipt | null {
  if (!data || typeof data !== 'object' || !('operationId' in data) || data.operationId !== operationId || !('status' in data)) return null
  if (data.status !== 'pending' && data.status !== 'confirmed' && data.status !== 'rejected' && data.status !== 'uncertain') return null
  const code = 'code' in data ? data.code : undefined
  const value = 'value' in data ? data.value : undefined
  if (code !== undefined && typeof code !== 'string') return null
  if (value !== undefined && value !== null && typeof value !== 'boolean' && (typeof value !== 'number' || !Number.isFinite(value))) return null
  return { operationId, status: data.status, ...(code !== undefined ? { code } : {}), ...(value !== undefined ? { value } : {}) }
}

function displayValue(value: CellValue): string {
  return value === null ? 'Kosong' : typeof value === 'boolean' ? (value ? 'Tercentang' : 'Tidak tercentang') : String(value)
}

export function TutonEdit({ offeringId, sessionNumber, activity, value, editable, onConfirmed }: {
  offeringId: string
  sessionNumber: number
  activity: string
  value: CellValue
  editable: boolean
  onConfirmed?: () => void
}) {
  const numeric = activity.trim().toLowerCase() === 'nilai'
  const storageKey = `tuton-operation:${offeringId}:${sessionNumber}:${activity}`
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const [reviewing, setReviewing] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const inFlight = useRef(false)
  const notified = useRef(false)
  useEffect(() => {
    try {
      const operationId = sessionStorage.getItem(storageKey)
      setReceipt(operationId && /^[a-f0-9-]{36}$/i.test(operationId) ? { operationId, status: 'uncertain', code: 'restored' } : null)
    } catch { setMessage('Penyimpanan sesi tidak tersedia; simpan ID receipt sebelum meninggalkan halaman.') }
  }, [storageKey])
  const nextValue: CellValue = numeric ? (draft.trim() === '' ? null : Number(draft)) : draft === 'true'
  const valid = numeric ? (draft.trim() === '' || Number.isFinite(nextValue)) : (draft === 'true' || draft === 'false')
  useUnsavedDraft(editable && nextValue !== value && receipt?.status !== 'confirmed')

  async function request(operationId: string, action: 'update' | 'receipt' | 'reconcile', proposed?: CellValue) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(action === 'receipt' ? `/api/google/receipt?operationId=${encodeURIComponent(operationId)}` : `/api/google/${action}`, action === 'receipt'
        ? { cache: 'no-store' }
        : { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'update' ? { operationId, offeringId, sessionNumber, activity, expectedValue: value, value: proposed } : { operationId }) })
      const data: unknown = await response.json()
      const result = parseReceipt(data, operationId)
      if (!result) throw new Error('Respons receipt tidak valid.')
      setReceipt(result)
      if (result.status === 'confirmed' && !notified.current) {
        notified.current = true
        onConfirmed?.()
      }
    } catch {
      setReceipt(previous => previous?.status === 'confirmed' || previous?.status === 'rejected' ? previous : { operationId, status: 'uncertain' })
      setMessage('Hasil belum diketahui. Periksa receipt atau baca ulang sumber; jangan kirim ulang perubahan.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  function submit() {
    if (!editable || !valid || busy || receipt || !reviewing) return
    const operationId = crypto.randomUUID()
    try { sessionStorage.setItem(storageKey, operationId) } catch { setMessage('Penyimpanan sesi tidak tersedia. Simpan ID receipt sebelum meninggalkan halaman.') }
    setReceipt({ operationId, status: 'pending' })
    setReviewing(false)
    void request(operationId, 'update', nextValue)
  }

  return <section className="flex min-w-0 flex-col gap-2 text-sm" aria-label={`Edit ${activity} sesi ${sessionNumber}`}>
    <p>Offering {offeringId} · Sesi {sessionNumber} · {activity} · Sumber Google Sheets</p>
    {!editable && <p>Pengeditan tidak tersedia sampai izin tulis dan binding sumber valid.</p>}
    {numeric ? <label className="flex flex-col gap-1">Nilai baru (kosong untuk menghapus)<Input type="number" step="any" value={draft} disabled={!editable || !!receipt || busy} onChange={event => { setDraft(event.target.value); setReviewing(false) }} /></label>
      : <label className="flex items-center gap-2"><input type="checkbox" checked={draft === 'true'} disabled={!editable || !!receipt || busy} onChange={event => { setDraft(String(event.target.checked)); setReviewing(false) }} />Tercentang</label>}
    {!valid && <p role="alert">Masukkan nilai angka yang valid.</p>}
    {!receipt && !reviewing && <Button type="button" variant="outline" disabled={!editable || !valid || busy || Object.is(value, nextValue)} onClick={() => setReviewing(true)}>Tinjau perubahan</Button>}
    {!receipt && reviewing && <div className="flex flex-col gap-2"><p>Nilai lama: <strong>{displayValue(value)}</strong> · Nilai baru: <strong>{displayValue(nextValue)}</strong></p><p>Perubahan orang lain di Google Sheets dapat terjadi setelah pemeriksaan dan tertimpa. Pemeriksaan ini bukan penguncian atau compare-and-swap atomik.</p><div className="flex flex-wrap gap-2"><Button type="button" disabled={!editable || busy} onClick={submit}>Konfirmasi perubahan</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setReviewing(false)}>Kembali ke draf</Button></div></div>}
    {receipt && <div className="flex flex-col gap-2" role="status"><p>Receipt {receipt.operationId}: {receipt.status === 'pending' ? 'Sedang diproses' : receipt.status === 'confirmed' ? 'Dikonfirmasi melalui pembacaan ulang' : receipt.status === 'rejected' ? 'Ditolak' : 'Hasil belum pasti'}{receipt.code ? ` (${receipt.code})` : ''}{'value' in receipt ? ` · Nilai terbaca: ${displayValue(receipt.value ?? null)}` : ''}</p>{receipt.status === 'rejected' && <p>Draf dipertahankan. Baca ulang sumber sebelum membuat perubahan baru.</p>}{(receipt.status === 'pending' || receipt.status === 'uncertain') && <><p>Jangan kirim ulang perubahan. Baca receipt atau baca ulang sumber untuk memeriksa hasil.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void request(receipt.operationId, 'receipt')}>Baca receipt</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void request(receipt.operationId, 'reconcile')}>Baca ulang sumber</Button></div></>}</div>}
    {receipt && (receipt.status === 'confirmed' || receipt.status === 'rejected') && <Button type="button" variant="outline" disabled={busy} onClick={() => { try { sessionStorage.removeItem(storageKey) } catch { /* Receipt remains available server-side. */ } setReceipt(null); setReviewing(false); notified.current = false; setDraft(value === null ? '' : String(value)); setMessage('Baca ulang workbook sebelum mengubah lagi. Nilai lama tetap diperiksa server.'); }}>Siapkan perubahan baru</Button>}
    {message && <p role="alert">{message}</p>}
  </section>
}
