import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BookOpen, FileText, Link2, LockKeyhole, LoaderCircle, GraduationCap } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const messages: Record<string, string> = {
  cancelled: 'Proses masuk dibatalkan. Anda dapat mencobanya lagi ketika siap.',
  forbidden: 'Akun ini tidak memiliki akses. Gunakan akun Google owner yang terdaftar.',
  invalid_callback: 'Tautan masuk sudah kedaluwarsa atau tidak valid. Mulai kembali dari halaman ini.',
  provider_unavailable: 'Google belum dapat dihubungi. Periksa koneksi, lalu coba masuk lagi.',
  not_configured: 'Login belum siap di server. Konfigurasi autentikasi perlu diperiksa.',
}
function destination(value: unknown) { return typeof value === 'string' && /^\/(\?tab=(today|courses|notes|connections))?$/.test(value) ? value : '/' }
export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({ returnTo: destination(search.returnTo), error: typeof search.error === 'string' && Object.hasOwn(messages, search.error) ? search.error : undefined, reason: typeof search.reason === 'string' && ['logout_failed', 'expired', 'closed', 'required'].includes(search.reason) ? search.reason : undefined }),
  head: () => ({ meta: [{ title: 'Masuk | Study Dashboard' }] }),
  component: Login,
})
function Login() {
  const search = Route.useSearch()
  const [state, setState] = useState<'checking' | 'ready' | 'redirecting' | 'logout' | 'logout_failed' | 'unavailable'>('checking')
  const [error, setError] = useState(search.error ? messages[search.error] : '')
  const [attempt, setAttempt] = useState(0)
  async function retryLogout() {
    setState('logout')
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000) })
      if (!response.ok) { setState('logout_failed'); return }
      location.replace('/login?reason=closed')
    } catch { setState('logout_failed') }
  }
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    async function prepare() {
      if (search.reason === 'logout_failed') {
        setState('logout_failed')
        return
      }
      try {
        const response = await fetch('/api/session', { cache: 'no-store', signal: controller.signal })
        if (!active) return
        if (response.ok && !search.error && !search.reason) { setState('redirecting'); location.replace(search.returnTo); return }
        if (response.status === 503) { setError(messages.not_configured); setState('unavailable'); return }
        if (response.status !== 401 && response.status !== 403 && !response.ok) { setError('Sesi belum dapat diperiksa. Periksa koneksi, lalu coba lagi.'); setState('unavailable'); return }
        setState('ready')
      } catch { if (active) { setError('Sesi belum dapat diperiksa. Periksa koneksi, lalu coba lagi.'); setState('unavailable') } }
    }
    void prepare()
    return () => { active = false; controller.abort() }
  }, [search.reason, search.error, search.returnTo, attempt])
  const waiting = state === 'checking' || state === 'redirecting' || state === 'logout'
  const notice = search.reason === 'expired' ? 'Sesi berakhir. Silakan masuk kembali.' : search.reason === 'closed' ? 'Anda telah keluar.' : ''
  return <main id="main-content" className="grid min-h-svh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
    <section aria-label="Study Dashboard" className="flex flex-col justify-between gap-8 bg-brand text-brand-foreground px-6 py-6 sm:px-10 lg:min-h-svh lg:px-14 lg:py-12 xl:px-20">
      <a href="/login" className="flex min-h-11 w-fit items-center gap-3 rounded-md text-sm font-semibold outline-offset-4 focus-visible:outline-2 focus-visible:outline-current"><BookOpen className="size-6" aria-hidden="true" />Study Dashboard</a>
      <div className="flex max-w-xl flex-col gap-8 py-2 lg:py-8">
        <figure aria-label="Catatan, materi, dan sumber belajar dalam satu ruang pribadi" className="relative hidden min-h-64 items-center justify-center sm:flex lg:min-h-72">
          <div className="absolute inset-x-8 inset-y-5 rounded-full border border-current/15" aria-hidden="true" />
          <div className="relative flex size-40 items-center justify-center rounded-3xl bg-brand-foreground/10 sm:size-48"><BookOpen aria-hidden="true" className="size-24 sm:size-28" strokeWidth={1} /></div>
          <div className="absolute top-5 left-0 flex items-center gap-3 rounded-xl bg-brand-foreground px-4 py-3 text-brand shadow-lg shadow-black/10"><FileText aria-hidden="true" className="size-5" /><span className="text-sm font-medium">Catatan Anda</span></div>
          <div className="absolute right-0 bottom-5 flex items-center gap-3 rounded-xl bg-brand-foreground px-4 py-3 text-brand shadow-lg shadow-black/10"><Link2 aria-hidden="true" className="size-5" /><span className="text-sm font-medium">Sumber belajar</span></div>
        </figure>
        <div className="flex flex-col gap-4"><h2 className="text-balance text-3xl leading-tight font-semibold tracking-tight sm:text-4xl xl:text-5xl">Ruang untuk belajar.<br />Tempat untuk kembali.</h2><p className="max-w-sm text-pretty text-sm leading-6 sm:text-base sm:leading-7">Catatan, materi, dan sumber belajar Anda. Lanjutkan dari hal yang ingin dipahami.</p></div>
        <div className="flex items-center gap-3 border-t border-current/25 pt-5 text-sm"><GraduationCap aria-hidden="true" className="size-5 shrink-0" />Perjalanan belajar di Universitas Terbuka.</div>
      </div>
      <p className="hidden items-center gap-2 text-sm lg:flex"><LockKeyhole aria-hidden="true" className="size-4" />Ruang pribadi. Akses khusus owner.</p>
    </section>
    <section aria-labelledby="login-title" className="relative flex flex-col px-6 pb-10 sm:px-10 lg:min-h-svh lg:px-14 xl:px-20">
      <div className="flex justify-end py-4 lg:py-8"><ThemeToggle /></div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-8 lg:py-16">
        <div className="flex flex-col gap-3"><h1 id="login-title" className="text-balance text-3xl font-semibold tracking-tight">Selamat datang kembali</h1><p className="text-sm leading-6 text-muted-foreground">Masuk dengan akun Google owner Anda.</p></div>
        {notice && <p role="status" className="text-sm leading-6 text-muted-foreground">{notice}</p>}
        {error && <Alert variant="destructive"><AlertTitle>Belum dapat masuk</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {state === 'logout_failed' ? <Alert variant="destructive"><AlertTitle>Keluar belum selesai</AlertTitle><AlertDescription>Data lokal sudah ditutup, tetapi sesi server belum terkonfirmasi dicabut. Jangan tinggalkan perangkat bersama sebelum mencoba lagi.</AlertDescription></Alert> : null}
        <div className="flex flex-col gap-4">
          {waiting ? <Button disabled className="h-12 w-full gap-3 transition-colors"><LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />{state === 'logout' ? 'Menutup sesi server…' : state === 'redirecting' ? 'Membuka halaman tujuan…' : 'Memeriksa sesi…'}</Button> : state === 'logout_failed' || state === 'unavailable' ? <Button className="h-12 w-full transition-colors" onClick={() => { if (state === 'logout_failed') { void retryLogout(); return }; setError(''); setState('checking'); setAttempt(value => value + 1) }}>{state === 'logout_failed' ? 'Coba keluar lagi' : 'Periksa koneksi lagi'}</Button> : <Button className="h-12 w-full gap-3 bg-brand text-brand-foreground hover:bg-brand-hover transition-colors" onClick={() => { setState('redirecting'); location.assign('/api/auth/google/login?returnTo=' + encodeURIComponent(search.returnTo)) }}><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor"><path d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36ZM12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22ZM6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04l3.34-2.59ZM12 5.95c1.47 0 2.78.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59A5.99 5.99 0 0 1 12 5.95Z" /></svg>Masuk dengan Google</Button>}
          {state === 'redirecting' && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Mengalihkan halaman…</p>}
        </div>
      </div>
    </section>
  </main>
}
