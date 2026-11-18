import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from './ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'

type SessionStatus = 'loading' | 'owner' | 'signed_out' | 'not_configured' | 'error'
interface SessionControls { logout: () => void; register: (key: symbol, dirty: boolean) => void; hasUnsavedDraft: () => boolean }
const SessionContext = createContext<SessionControls | null>(null)

export function useUnsavedDraft(dirty: boolean) {
  const session = useContext(SessionContext)
  const key = useRef(Symbol('draft'))
  useEffect(() => { session?.register(key.current, dirty); return () => session?.register(key.current, false) }, [session, dirty])
}
export function LogoutButton() {
  const session = useContext(SessionContext)
  const [open, setOpen] = useState(false)
  if (!session) return null
  return <AlertDialog open={open} onOpenChange={nextOpen => { if (nextOpen && !session.hasUnsavedDraft()) session.logout(); else setOpen(nextOpen) }}>
    <AlertDialogTrigger render={<Button data-session-logout variant="ghost" className="h-11 gap-2 px-3 transition-colors" />}><LogOut aria-hidden="true" />Keluar</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Keluar dari ruang belajar?</AlertDialogTitle>
        <AlertDialogDescription>Draf yang belum tersimpan atau diekspor akan hilang. Simpan draf terlebih dahulu jika masih diperlukan.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="min-h-11">Batal</AlertDialogCancel>
        <AlertDialogAction className="min-h-11" onClick={() => { setOpen(false); session.logout() }}>Keluar</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
export function OwnerSession({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const drafts = useRef(new Set<symbol>())
  const closed = useRef(false)
  const verified = useRef(false)
  const expires = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const register = useCallback((key: symbol, dirty: boolean) => { if (dirty) drafts.current.add(key); else drafts.current.delete(key) }, [])
  const [controls] = useState<SessionControls>(() => ({
    register, hasUnsavedDraft: () => drafts.current.size > 0, logout: () => {
      if (closed.current) return
      closed.current = true
      setStatus('signed_out')
      if (typeof BroadcastChannel === 'function') { const channel = new BroadcastChannel('study-session'); channel.postMessage('logout'); channel.close() }
      void fetch('/api/auth/logout', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000) }).then(response => window.location.replace(response.ok ? '/login?reason=closed' : '/login?reason=logout_failed')).catch(() => window.location.replace('/login?reason=logout_failed'))
    }
  }))
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    let checking = false
    function leave(reason: string) {
      if (!active || closed.current) return
      closed.current = true
      setStatus('signed_out')
      const target = new URL('/login', location.origin)
      target.searchParams.set('reason', reason)
      target.searchParams.set('returnTo', location.pathname + location.search)
      location.replace(target.href)
    }
    async function check() {
      if (checking || closed.current) return
      checking = true
      try {
        const response = await fetch('/api/session', { cache: 'no-store', signal: controller.signal })
        if (!active || closed.current) return
        if (response.status === 401 || response.status === 403) { leave(verified.current ? 'expired' : 'required'); return }
        if (!response.ok) { setStatus(response.status === 503 ? 'not_configured' : 'error'); return }
        const data: unknown = await response.json()
        if (!data || typeof data !== 'object' || !('authenticated' in data) || data.authenticated !== true || !('expiresAt' in data) || typeof data.expiresAt !== 'number' || !Number.isFinite(data.expiresAt)) { setStatus('error'); return }
        clearTimeout(expires.current)
        if (data.expiresAt <= Date.now()) { leave('expired'); return }
        expires.current = setTimeout(() => leave('expired'), Math.min(data.expiresAt - Date.now(), 2147483647))
        verified.current = true
        setStatus('owner')
      } catch { if (active && !closed.current) setStatus('error') }
      finally { checking = false }
    }
    void check()
    const focus = () => { void check() }
    window.addEventListener('focus', focus)
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('study-session') : null
    if (channel) channel.onmessage = () => leave('closed')
    return () => { active = false; controller.abort(); clearTimeout(expires.current); window.removeEventListener('focus', focus); channel?.close() }
  }, [])
  if (status !== 'owner') return <main className="flex min-h-svh items-center justify-center p-6"><div className="flex max-w-md flex-col gap-4 text-center" role="status"><p>{status === 'loading' ? 'Memeriksa sesi Anda…' : status === 'signed_out' ? 'Menutup ruang belajar…' : 'Sesi tidak dapat diverifikasi. Isi dashboard tetap ditutup.'}</p>{(status === 'error' || status === 'not_configured') && <Button className="h-11 transition-colors" render={<a href="/login" />}>Buka halaman login</Button>}</div></main>
  return <SessionContext.Provider value={controls}>{children}</SessionContext.Provider>
}
