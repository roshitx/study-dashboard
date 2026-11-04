import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui/button'

type Status = 'loading' | 'owner' | 'signed_out' | 'not_configured' | 'error'
export function OwnerSession({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [generation, setGeneration] = useState(0)
  const [cleared, setCleared] = useState(false)
  const invalidated = useRef(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    void fetch('/api/session', { cache: 'no-store', signal: controller.signal }).then(response => {
      if (active && !invalidated.current) setStatus(response.ok ? 'owner' : response.status === 401 ? 'signed_out' : response.status === 503 ? 'not_configured' : 'error')
    }).catch(() => { if (active && !invalidated.current) setStatus('error') })
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('study-session') : null
    if (channel) channel.onmessage = () => { invalidated.current = true; active = false; controller.abort(); setCleared(true); setGeneration(g => g + 1); setStatus('signed_out'); setMessage('Session ditutup dari tab lain. Data lokal dibersihkan.') }
    return () => { active = false; controller.abort(); channel?.close() }
  }, [])
  async function logout() {
    invalidated.current = true
    setCleared(true)
    setGeneration(g => g + 1)
    setStatus('signed_out')
    setMessage('Data lokal dibersihkan. Menutup session server…')
    if (typeof BroadcastChannel === 'function') { const channel = new BroadcastChannel('study-session'); channel.postMessage('logout'); channel.close() }
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' })
      setMessage(response.ok ? 'Session server ditutup. Data lokal dibersihkan.' : 'Data lokal dibersihkan; session server belum terkonfirmasi dicabut. Coba logout lagi.')
    } catch { setMessage('Data lokal dibersihkan; koneksi gagal. Session server mungkin masih aktif. Coba logout lagi.') }
  }
  return <>
    <section aria-label="Session owner" className="p-4">
      <p>{status === 'owner' ? 'Owner terautentikasi · Google sign-in, tanpa grant Sheets/Calendar.' : status === 'loading' ? 'Memeriksa session owner…' : status === 'not_configured' ? 'Login owner belum dikonfigurasi. Ruang lokal/demo tidak mengakses data server privat.' : status === 'error' ? 'Session owner tidak dapat diverifikasi. API privat tetap ditolak.' : 'Belum masuk sebagai owner. Ruang lokal/demo terpisah dari API privat.'}</p>
      {status === 'signed_out' && <a href="/api/auth/google/login">Masuk dengan Google</a>}
      <Button data-session-logout variant="outline" onClick={() => void logout()}>Logout dan bersihkan data lokal</Button>
      {message && <p role="status">{message}</p>}
      {cleared && <Button variant="outline" onClick={() => setCleared(false)}>Buka ruang lokal kosong</Button>}
    </section>
    {!cleared && <div key={generation}>{children}</div>}
  </>
}
