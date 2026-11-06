import { useMemo, useState } from 'react'
import type { IndexedNote } from '@/domain/snapshot-index'
import { extractPractice, reviewPractice, type PracticeAttempt } from '@/domain/practice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function SnapshotPractice({ note, onClose }: { note: IndexedNote; onClose: () => void }) {
  const [version, setVersion] = useState(0)
  const set = useMemo(() => extractPractice(note, version), [note, version])
  const [stage, setStage] = useState<'preview' | 'answer' | 'review'>('preview')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const attempt = attempts[reviewIndex]
  return <Card role="region" aria-label="Latihan snapshot lokal">
    <CardHeader><CardTitle>Latihan manual</CardTitle><CardDescription className="break-all">{note.canonicalPath} · Memori browser, tanpa AI. Menutup snapshot/logout menghapus attempts.</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-4">
      <Button variant="outline" className="min-h-11 self-start" onClick={onClose}>Kembali ke sumber</Button>
      {stage === 'preview' && <>
        <Field><FieldLabel htmlFor="practice-version">Versi sumber latihan</FieldLabel><Select value={String(version)} onValueChange={v => setVersion(Number(v))} items={note.versions.map((v, i) => ({ value: String(i), label: `Versi ${i + 1} · ${v.hash.slice(0, 12)}` }))}><SelectTrigger id="practice-version"><SelectValue /></SelectTrigger><SelectContent>{note.versions.map((v, i) => <SelectItem key={v.hash} value={String(i)}>Versi {i + 1} · {v.hash.slice(0, 12)}</SelectItem>)}</SelectContent></Select></Field>
        <p>Preview ekstraksi: {set.questions.length} soal. Kunci dan rubrik tidak ditampilkan sebelum review. Format: soal bernomor, opsi A/B, Kunci/Jawaban, Rubrik, Peringatan.</p>
        {set.diagnostics.map((message, i) => <Alert key={i}><AlertDescription>{message}</AlertDescription></Alert>)}
        {!set.questions.length && <p role="status">Tidak ada soal berformat didukung. Sumber tetap utuh; periksa format pada reader.</p>}
        {set.questions.map(q => <div key={q.id}><p className="font-medium whitespace-pre-wrap">{q.prompt}</p><p className="text-sm text-muted-foreground">{q.kind} · {q.source.heading ?? 'Tanpa heading'} · Modul: {q.source.module ?? 'Tidak dinyatakan'}</p></div>)}
        <Button className="min-h-11 self-start" disabled={!set.questions.length} onClick={() => { setAnswers({}); setStage('answer') }}>Mulai latihan</Button>
      </>}
      {stage === 'answer' && <form className="flex flex-col gap-6" onSubmit={event => {
        event.preventDefault()
        const next = reviewPractice(set, answers, crypto.randomUUID())
        setAttempts(previous => [...previous, next]); setReviewIndex(attempts.length); setStage('review')
      }}>
        {set.questions.map((q, i) => <fieldset key={q.id} className="flex min-w-0 flex-col gap-2"><legend className="mb-2 whitespace-pre-wrap font-medium">{i + 1}. {q.prompt}</legend>
          {q.kind === 'choice' ? q.options.map(option => <label key={option.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3 has-checked:bg-accent"><input required type="radio" name={q.id} value={option.id} checked={answers[q.id] === option.id} onChange={() => setAnswers(previous => ({ ...previous, [q.id]: option.id }))} /><span className="whitespace-pre-wrap">{option.id}. {option.text}</span></label>) : <Textarea required aria-label={`Jawaban soal ${i + 1}`} value={answers[q.id] ?? ''} onChange={event => setAnswers(previous => ({ ...previous, [q.id]: event.target.value }))} />}
        </fieldset>)}
        <Button type="submit" className="min-h-11 self-start">Selesai dan review</Button>
      </form>}
      {stage === 'review' && attempt && <>
        <h4 className="font-semibold">Review attempt {reviewIndex + 1}</h4>
        {attempt.reviews.map(review => {
          const question = set.questions.find(q => q.id === review.questionId)
          const key = set.keys.find(k => k.questionId === review.questionId)
          return <section key={review.questionId} className="flex flex-col gap-2 rounded-lg border p-4"><p className="font-medium whitespace-pre-wrap">{question?.prompt}</p><p className="whitespace-pre-wrap">Jawaban Anda: {attempt.answers[review.questionId] ?? 'Belum dijawab'}</p><p>Kunci sumber: {key?.answer ?? 'Tidak tersedia'}</p><p>{review.correct === null ? 'Tidak dinilai pasti' : review.correct ? 'Sesuai kunci tervalidasi' : 'Berbeda dari kunci tervalidasi'}</p><p>{review.feedback}</p>{review.warnings.map((w, i) => <Alert key={i}><AlertDescription>{w}</AlertDescription></Alert>)}{question?.kind === 'essay' && <p>Review manual, estimasi bukan nilai resmi. Rubrik: {key?.rubric ?? 'Tidak tersedia, belum dapat dinilai.'}</p>}<p className="break-all text-sm text-muted-foreground">Sumber: {review.source.path} · {review.source.hash} · Heading: {review.source.heading ?? 'Tidak dinyatakan'} · Modul: {review.source.module ?? 'Tidak dinyatakan'}</p></section>
        })}
        <Button className="min-h-11 self-start" onClick={() => { setAnswers({}); setStage('answer') }}>Kerjakan attempt baru</Button>
      </>}
      {stage !== 'answer' && attempts.length > 0 && <div role="group" className="flex flex-wrap gap-2" aria-label="Histori attempt">{attempts.map((a, i) => <Button key={a.id} variant="outline" className="min-h-11" onClick={() => { setReviewIndex(i); setStage('review') }}>Review attempt {i + 1}</Button>)}</div>}
    </CardContent>
  </Card>
}
