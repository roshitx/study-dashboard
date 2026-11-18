import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BookOpen, FileText, GraduationCap, LayoutDashboard, Link2, LockKeyhole, Upload } from 'lucide-react'
import { parseAcademicMetadata, type AcademicMetadata } from '@/domain/metadata'
import { integrationStates } from '../integrations/contracts'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LocalImport } from '@/components/local-import'
import { OwnerSession, LogoutButton } from '@/components/owner-session'
import { ThemeToggle } from '@/components/theme-toggle'
import { VaultReader } from '@/components/vault-reader'
import { GoogleConnection } from '@/components/google-connection'

type Tab = 'today' | 'courses' | 'notes' | 'connections'
const navigation = [
  { id: 'today', label: 'Hari ini', icon: LayoutDashboard },
  { id: 'courses', label: 'Mata kuliah', icon: GraduationCap },
  { id: 'notes', label: 'Catatan', icon: FileText },
  { id: 'connections', label: 'Koneksi', icon: Link2 },
] as const
export const Route = createFileRoute('/')({ validateSearch: (search: Record<string, unknown>) => ({ tab: navigation.find(item => item.id === search.tab)?.id }), component: () => <TooltipProvider><OwnerSession><Dashboard /></OwnerSession></TooltipProvider> })

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
  const [semesterId, setSemesterId] = useState('')
  const search = Route.useSearch()
  const [tab, setTab] = useState<Tab>(search.tab ?? 'today')
  function changeTab(value: Tab) { setTab(value); const url = new URL(location.href); url.searchParams.set('tab', value); history.replaceState(history.state, '', url.href) }
  const [metadata, setMetadata] = useState<AcademicMetadata | null>(null)
  const [metadataError, setMetadataError] = useState('')
  const [metadataLoading, setMetadataLoading] = useState(true)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setMetadataLoading(true); setMetadataError('')
    void (async () => {
      try {
        const response = await fetch('/api/metadata', { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Semester tersimpan belum dapat dibaca. Periksa sesi dan konfigurasi metadata, lalu coba lagi.')
        const value: unknown = await response.json()
        if (!value || typeof value !== 'object' || !('metadata' in value)) throw new Error('Respons metadata tidak valid.')
        const next = parseAcademicMetadata(value.metadata)
        if (controller.signal.aborted) return
        setMetadata(next)
        setSemesterId(current => next.semesters.some(s => s.id === current) ? current : (next.semesters.find(s => s.active) ?? next.semesters[0])?.id ?? '')
      } catch (error) {
        if (!controller.signal.aborted) setMetadataError(error instanceof Error ? error.message : 'Metadata gagal dibaca.')
      } finally { if (!controller.signal.aborted) setMetadataLoading(false) }
    })()
    return () => controller.abort()
  }, [reload])
  const semesters = metadata?.semesters ?? []
  const courseList = (metadata?.offerings ?? []).filter(o => o.semesterId === semesterId).flatMap(offering => {
    const course = metadata?.courses.find(c => c.id === offering.courseId)
    return course ? [{ ...course, ...offering }] : []
  })
  const heading = { today: 'Hari ini', courses: 'Mata kuliah', notes: 'Catatan & materi', connections: 'Koneksi sumber' }[tab]
  return <SidebarProvider><StudyNavigation tab={tab} onChange={changeTab} /><SidebarInset className="min-w-0">
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b px-4 md:gap-3 md:px-8"><SidebarTrigger aria-label="Buka atau tutup navigasi" /><Separator orientation="vertical" className="h-4 data-vertical:self-center" /><span className="min-w-0 truncate text-sm font-medium">{heading}</span><div className="ml-auto flex shrink-0 items-center gap-1"><ThemeToggle /><LogoutButton /></div></header>
    <main id="main-content" className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="flex flex-col gap-1"><p className="text-sm text-muted-foreground">Ruang belajar pribadi</p><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{heading}</h1><p className="text-sm text-muted-foreground">{tab === 'notes' ? 'Baca dan edit berkas Anda, lalu ekspor perubahan.' : tab === 'connections' ? 'Kelola izin dan periksa sumber Google serta vault.' : 'Semester tersimpan dan sumber belajar Anda, tanpa data contoh.'}</p></div>{semesters.length > 0 && <Field className="w-full sm:w-52"><FieldLabel htmlFor="semester">Semester pribadi</FieldLabel><Select value={semesterId} onValueChange={value => { if (value) setSemesterId(value) }} items={semesters.map(s => ({ value: s.id, label: `Semester ${s.number}${s.active ? ' · Aktif' : ''}` }))}><SelectTrigger id="semester" className="min-h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{semesters.map(s => <SelectItem value={s.id} key={s.id}>Semester {s.number}{s.active ? ' · Aktif' : ''}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>}</div>
      {(tab === 'today' || tab === 'courses') && <>
        {metadataLoading && <p role="status">Membaca semester dan mata kuliah tersimpan…</p>}
        {metadataError && <Alert variant="destructive"><AlertTitle>Metadata belum dapat diperbarui</AlertTitle><AlertDescription>{metadataError}{metadata && ' Ringkasan di bawah berasal dari pembacaan sebelumnya.'}</AlertDescription></Alert>}
        {metadata && !metadataLoading && !metadataError && <p className="text-sm text-muted-foreground">Sumber: konfigurasi akademik tersimpan. Nilai dan aktivitas tetap dibaca dari Google Sheets, bukan dari ringkasan ini.</p>}
        <Button className="min-h-11 self-start" variant="outline" disabled={metadataLoading} onClick={() => setReload(value => value + 1)}>{metadataError ? 'Coba baca metadata lagi' : 'Perbarui ringkasan semester'}</Button>
        {metadata && !metadataLoading && !metadataError && !courseList.length && <Empty><EmptyHeader><EmptyTitle>{semesters.length ? 'Belum ada mata kuliah pada semester ini' : 'Belum ada semester tersimpan'}</EmptyTitle><EmptyDescription>Baca workbook Google Sheets di bawah, pilih worksheet, lalu simpan hubungan ke semester Anda. Setelah menyimpan, pilih Perbarui ringkasan semester. Halaman ini tidak menyediakan editor metadata umum; tidak ada semester atau SKS yang diisi otomatis.</EmptyDescription></EmptyHeader></Empty>}
        {courseList.length > 0 && <section aria-label="Mata kuliah tersimpan" className="flex flex-col gap-4"><div><h2 className="text-xl font-semibold">Mata kuliah semester ini</h2><p className="text-sm text-muted-foreground">{semesters.find(s => s.id === semesterId)?.academicPeriod ?? 'Periode UT belum ditetapkan'}</p></div><ul className="divide-y rounded-md border px-4">{courseList.map(c => <li key={c.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><div className="min-w-0"><h3 className="break-words font-medium">{c.name}</h3><p className="break-words text-sm text-muted-foreground">{c.courseCode}{c.classId ? ` · Kelas ${c.classId}` : ''}{c.sourceCourseCode ? ` · BMP ${c.sourceCourseCode}` : ''}</p></div><p className="shrink-0 text-sm text-muted-foreground">{c.credits === null ? 'SKS belum dikonfirmasi' : `${c.credits} SKS`}</p></li>)}</ul></section>}
      </>}
      {tab === 'today' && <section className="study-focus"><div className="flex flex-col gap-4"><h2 className="text-2xl font-semibold tracking-tight">Lanjutkan dari materi Anda</h2><p className="max-w-lg text-sm leading-7">Buka catatan lokal untuk membaca, berlatih, dan mengekspor draf. Interval sibuk Calendar dapat dibaca di panel Google, bukan dianggap agenda atau progres belajar.</p><Button className="min-h-11 self-start" variant="secondary" onClick={() => changeTab('notes')}><Upload aria-hidden="true" />Buka catatan lokal</Button></div></section>}
      <section hidden={tab !== 'notes'} aria-label="Catatan lokal"><LocalImport /></section>
      <section hidden={tab === 'notes'} aria-label="Sumber Google"><GoogleConnection /></section>
      {tab === 'connections' && <VaultReader />}
      {tab === 'connections' && <section aria-label="Integrasi belum tersedia">{Object.entries(integrationStates).filter(([name]) => !['vault', 'sheets', 'calendar'].includes(name)).map(([name]) => <p key={name} className="text-sm text-muted-foreground">{name}: belum dikonfigurasi. Tidak ada operasi eksternal aktif.</p>)}</section>}
      <footer className="flex flex-wrap justify-between gap-2 border-t pt-5 text-xs text-muted-foreground"><span>Study Assistant UT</span><span>Bahasa Indonesia · Asia/Jakarta</span></footer>
    </main>
  </SidebarInset></SidebarProvider>
}
