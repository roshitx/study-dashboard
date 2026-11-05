import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { BookOpen, CalendarDays, FileText, GraduationCap, LayoutDashboard, Link2, LockKeyhole, Save, Upload } from 'lucide-react'
import { notes, offerings, semesters } from '../data/demo'
import { integrationStates } from '../integrations/contracts'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia, EmptyContent } from '@/components/ui/empty'
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LocalImport } from '@/components/local-import'
import { OwnerSession } from '@/components/owner-session'
import { ThemeToggle } from '@/components/theme-toggle'

type Tab = 'today' | 'courses' | 'notes' | 'connections'
const navigation = [
  { id: 'today', label: 'Hari ini', icon: LayoutDashboard },
  { id: 'courses', label: 'Mata kuliah', icon: GraduationCap },
  { id: 'notes', label: 'Catatan', icon: FileText },
  { id: 'connections', label: 'Koneksi', icon: Link2 },
] as const
export const Route = createFileRoute('/')({ component: () => <TooltipProvider><OwnerSession><Dashboard /></OwnerSession></TooltipProvider> })

function StudyNavigation({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { setOpenMobile } = useSidebar()
  const [hoveredTab, setHoveredTab] = useState<Tab>('today')
  const [hovering, setHovering] = useState(false)
  return <Sidebar>
    <SidebarHeader className="px-6 pt-7 pb-8"><a href="/" className="flex items-center gap-3"><BookOpen className="size-7 text-primary" aria-hidden="true" /><div><p className="font-semibold tracking-tight">Study space</p><p className="text-xs text-muted-foreground">Universitas Terbuka</p></div></a></SidebarHeader>
    <SidebarContent className="px-3"><SidebarGroup className="gap-2 p-0"><SidebarGroupLabel className="px-3">Ruang belajar</SidebarGroupLabel><SidebarGroupContent><nav aria-label="Navigasi utama" className="relative" onMouseLeave={() => setHovering(false)}><span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-11 rounded-md bg-sidebar-accent transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none" style={{ transform: `translateY(${navigation.findIndex(item => item.id === hoveredTab) * 50}px)`, opacity: hovering ? 1 : 0 }} /><span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-11 rounded-md bg-sidebar-primary transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ transform: `translateY(${navigation.findIndex(item => item.id === tab) * 50}px)` }} /><SidebarMenu className="relative gap-1.5">{navigation.map(item => <SidebarMenuItem key={item.id}><SidebarMenuButton className="h-11 gap-3 px-3 hover:bg-transparent data-active:bg-transparent data-active:hover:bg-transparent" onMouseEnter={() => { setHoveredTab(item.id); setHovering(true) }} isActive={tab === item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => { onChange(item.id); setOpenMobile(false) }}><item.icon aria-hidden="true" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></nav></SidebarGroupContent></SidebarGroup></SidebarContent>
    <SidebarFooter className="gap-4 px-6 pb-6 pt-4"><Separator /><div className="flex items-start gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-4 shrink-0" aria-hidden="true" /><p>Snapshot lokal di browser.<br />Tidak diunggah otomatis.</p></div><Badge variant="outline">Fondasi proyek · v0.1</Badge></SidebarFooter>
  </Sidebar>
}
function Dashboard() {
  const [semesterId, setSemesterId] = useState('demo-s2')
  const [tab, setTab] = useState<Tab>('today')
  const [selectedNote, setSelectedNote] = useState(notes[0].id)
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState(notes[0].markdown)
  const [message, setMessage] = useState('')
  const courseList = offerings.filter(c => c.semesterId === semesterId)
  const noteList = notes.filter(n => courseList.some(c => c.id === n.offeringId))
  function switchSemester(value: string) {
    if (selectedNote && draft !== (saved[selectedNote] ?? notes.find(n => n.id === selectedNote)?.markdown) && !window.confirm('Draf belum disimpan. Ganti semester?')) return
    setSemesterId(value)
    const next = notes.find(n => offerings.some(c => c.semesterId === value && c.id === n.offeringId))
    setSelectedNote(next?.id ?? ''); setDraft(next ? (saved[next.id] ?? next.markdown) : ''); setMessage('')
  }
  function selectNote(id: string) {
    if (selectedNote && draft !== (saved[selectedNote] ?? notes.find(n => n.id === selectedNote)?.markdown) && !window.confirm('Draf belum disimpan. Pindah catatan?')) return
    setSelectedNote(id); setDraft(saved[id] ?? notes.find(n => n.id === id)?.markdown ?? ''); setMessage('')
  }
  const note = noteList.find(n => n.id === selectedNote)
  const heading = { today: 'Hari ini', courses: 'Mata kuliah', notes: 'Catatan & materi', connections: 'Koneksi sumber' }[tab]
  return <SidebarProvider><StudyNavigation tab={tab} onChange={setTab} /><SidebarInset className="min-w-0">
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b px-4 md:gap-3 md:px-8"><SidebarTrigger aria-label="Buka atau tutup navigasi" /><Separator orientation="vertical" className="h-4 data-vertical:self-center" /><span className="min-w-0 truncate text-sm font-medium">{heading}</span><div className="ml-auto flex shrink-0 items-center gap-2"><Badge variant="secondary">Ruang lokal</Badge><ThemeToggle /></div></header>
    <main id="main-content" className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="flex flex-col gap-1"><p className="text-sm text-muted-foreground">Ruang belajar pribadi</p><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{heading}</h1><p className="text-sm text-muted-foreground">{tab === 'notes' ? 'Baca sumber, simpan pemahaman, pertahankan versi asli.' : tab === 'connections' ? 'Periksa kesiapan sumber sebelum memakai data live.' : 'Satu tempat untuk melanjutkan proses belajar Anda.'}</p></div><Field className="w-full sm:w-52"><FieldLabel htmlFor="demo-semester">Semester demo</FieldLabel><Select value={semesterId} onValueChange={value => { if (value) switchSemester(value) }} items={semesters.map(s => ({ value: s.id, label: `Semester ${s.number}${s.active ? ' · Aktif' : ''}` }))}><SelectTrigger id="demo-semester" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{semesters.map(s => <SelectItem value={s.id} key={s.id}>Semester {s.number}{s.active ? ' · Aktif' : ''}</SelectItem>)}</SelectGroup></SelectContent></Select></Field></div>
      <Alert><BookOpen aria-hidden="true" /><AlertTitle>Mode demo sintetis</AlertTitle><AlertDescription>Contoh bukan data live. Vault, Sheets, Calendar dan AI belum terhubung; draf hanya di memori browser.</AlertDescription></Alert>
      {tab === 'today' && <>
        <section className="study-focus"><div className="flex flex-col gap-4"><p className="text-sm font-medium">Mulai dari materi Anda</p><h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">Apa yang ingin Anda<br className="hidden sm:block" /> pahami hari ini?</h2><p className="max-w-lg text-sm leading-7">Buka snapshot catatan lokal untuk membaca materi, menulis draf dan mengekspor perubahan tanpa mengubah sumber.</p><div className="flex flex-wrap gap-3"><Button variant="secondary" size="lg" onClick={() => setTab('notes')}><Upload data-icon="inline-start" />Import catatan lokal</Button></div></div><BookOpen className="hidden size-28 shrink-0 opacity-30 lg:block" strokeWidth={1} aria-hidden="true" /></section>
        <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Agenda belajar</CardTitle><CardDescription>Calendar dan tenggat belum terhubung.</CardDescription></CardHeader><CardContent><Empty><EmptyHeader><EmptyMedia variant="icon"><CalendarDays /></EmptyMedia><EmptyTitle>Belum ada agenda live</EmptyTitle><EmptyDescription>Jadwal akan tersedia setelah sumber kalender dikonfigurasi. Tidak ada tenggat yang diasumsikan.</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={() => setTab('connections')}><Link2 data-icon="inline-start" />Lihat koneksi</Button></EmptyContent></Empty></CardContent></Card>
          <Card><CardHeader><CardTitle>Semester terpilih</CardTitle><CardDescription>Contoh struktur akademik, bukan progres aktual.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight">{courseList.length}</span><span className="text-sm text-muted-foreground">mata kuliah contoh</span></div><Separator /><ul className="flex flex-col gap-3">{courseList.slice(0, 3).map(c => <li key={c.id} className="flex items-start gap-3"><BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.courseCode}</p></div></li>)}</ul></CardContent><CardFooter><Button variant="outline" onClick={() => setTab('courses')}><GraduationCap data-icon="inline-start" />Lihat mata kuliah</Button></CardFooter></Card></div>
      </>}
      {tab === 'courses' && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Mata kuliah contoh">{courseList.map(c => <Card key={c.id}><CardHeader><div className="mb-2 flex items-center justify-between gap-2"><BookOpen className="size-5 text-muted-foreground" aria-hidden="true" /><Badge variant="outline">{c.courseCode}</Badge></div><CardTitle>{c.name}</CardTitle><CardDescription>{c.credits === null ? 'SKS belum ditetapkan' : `${c.credits} SKS`} · data contoh</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Status pengumpulan belum diketahui.</p></CardContent><CardFooter><Button variant="outline" onClick={() => { const n = noteList.find(n => n.offeringId === c.id); if (n) selectNote(n.id); setTab('notes') }}><FileText data-icon="inline-start" />Buka catatan</Button></CardFooter></Card>)}</section>}
      {tab === 'notes' && <><LocalImport /><section className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]" aria-label="Editor catatan demo"><Card><CardHeader><CardTitle>Catatan contoh</CardTitle><CardDescription>Terpisah dari snapshot lokal.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{noteList.map(n => <Button variant={n.id === selectedNote ? 'secondary' : 'ghost'} className="h-auto justify-start whitespace-normal py-3" key={n.id} aria-pressed={n.id === selectedNote} onClick={() => selectNote(n.id)}><FileText data-icon="inline-start" />{n.title}</Button>)}{!noteList.length && <p className="text-sm text-muted-foreground">Belum ada catatan contoh pada semester ini.</p>}</CardContent></Card><Card>{note ? <><CardHeader><Badge variant="outline">Editor demo · memori</Badge><CardTitle>{note.title}</CardTitle><CardDescription className="break-all">{note.path}</CardDescription></CardHeader><CardContent><Field><FieldLabel htmlFor="markdown">Isi catatan</FieldLabel><Textarea id="markdown" className="min-h-80" spellCheck={false} value={draft} onChange={e => { setDraft(e.target.value); setMessage('') }} /></Field></CardContent><CardFooter className="flex flex-col items-start gap-3"><Button onClick={() => { setSaved({ ...saved, [note.id]: draft }); setMessage('Disimpan ke memori demo. Muat ulang halaman akan menghapus perubahan.') }}><Save data-icon="inline-start" />Simpan ke memori demo</Button><p role="status" className="text-sm text-muted-foreground">{message}</p></CardFooter></> : <CardContent><Empty><EmptyHeader><EmptyTitle>Belum ada catatan contoh</EmptyTitle><EmptyDescription>Pilih semester yang memiliki catatan contoh.</EmptyDescription></EmptyHeader></Empty></CardContent>}</Card></section></>}
      {tab === 'connections' && <section className="grid gap-4 sm:grid-cols-2" aria-label="Status koneksi">{Object.entries(integrationStates).map(([name, state]) => <Card key={name}><CardHeader><div className="flex items-center justify-between gap-2"><Link2 className="size-5 text-muted-foreground" aria-hidden="true" /><Badge variant="outline">Belum dikonfigurasi</Badge></div><CardTitle>{name}</CardTitle><CardDescription>Tidak ada operasi baca/tulis eksternal aktif.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><code className="text-xs text-muted-foreground">{state}</code><p className="text-sm text-muted-foreground">Koneksi tersedia setelah konfigurasi dan verifikasi integrasi. Data contoh tidak diganti menjadi data live.</p></CardContent></Card>)}</section>}
      <footer className="flex flex-wrap justify-between gap-2 border-t pt-5 text-xs text-muted-foreground"><span>Study Assistant UT</span><span>Bahasa Indonesia · Asia/Jakarta</span></footer>
    </main>
  </SidebarInset></SidebarProvider>
}
