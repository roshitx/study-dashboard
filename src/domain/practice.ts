import type { IndexedNote } from './snapshot-index'

export interface PracticeQuestion {
  id: string
  kind: 'choice' | 'short' | 'essay'
  prompt: string
  options: { id: string; text: string }[]
  source: { path: string; hash: string; heading: string | null; module: string | null }
  warnings: string[]
}
export interface PracticeKey { questionId: string; answer: string | null; valid: boolean; rubric: string | null }
export interface PracticeSet { questions: PracticeQuestion[]; keys: PracticeKey[]; diagnostics: string[] }
export interface PracticeReview { questionId: string; correct: boolean | null; feedback: string; source: PracticeQuestion['source']; warnings: string[]; estimate: boolean }
export interface PracticeAttempt { id: string; answers: Record<string, string>; reviews: PracticeReview[] }

export function extractPractice(note: IndexedNote, versionIndex: number): PracticeSet {
  const version = note.versions[versionIndex]
  if (!version) return { questions: [], keys: [], diagnostics: ['Versi sumber tidak ditemukan.'] }
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(version.bytes) }
  catch { return { questions: [], keys: [], diagnostics: ['Sumber bukan UTF-8 yang valid.'] } }
  const diagnostics = [...version.diagnostics]
  const course = version.properties.get('course_code')
  const sourceCourse = version.properties.get('source_course_code')
  const sourceWarnings: string[] = []
  if (typeof course === 'string' && typeof sourceCourse === 'string' && course.trim().toUpperCase() !== sourceCourse.trim().toUpperCase()) {
    sourceWarnings.push(`Kode sumber ${sourceCourse} berbeda dari ${course}.`)
  }
  const moduleValue = version.properties.get('module') ?? version.properties.get('module_number')
  const module = typeof moduleValue === 'string' || typeof moduleValue === 'number' ? String(moduleValue) : null
  const questions: PracticeQuestion[] = []
  const keys: PracticeKey[] = []
  let heading: string | null = null
  let current: PracticeQuestion | null = null
  let answer: string | null = null
  let rubric: string | null = null
  let ambiguous = false
  const finish = () => {
    if (!current) return
    current.kind = current.options.length ? 'choice' : rubric !== null ? 'essay' : 'short'
    const optionIds = current.options.map(option => option.id)
    const valid = !ambiguous && answer !== null && answer.trim() !== '' && (current.kind !== 'choice' || (new Set(optionIds).size === optionIds.length && optionIds.includes(answer.trim().toUpperCase())))
    keys.push({ questionId: current.id, answer, valid, rubric })
    current = null
    answer = null
    rubric = null
    ambiguous = false
  }
  if (version.rawFrontmatter && text.startsWith(version.rawFrontmatter)) text = text.slice(version.rawFrontmatter.length)
  let fence: { marker: string; length: number } | null = null
  for (const line of text.split(/\r?\n/)) {
    const fenceLine = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceLine) {
      const marker = fenceLine[1][0]
      if (!fence) fence = { marker, length: fenceLine[1].length }
      else if (marker === fence.marker && fenceLine[1].length >= fence.length && /^ {0,3}(?:`+|~+)\s*$/.test(line)) fence = null
      continue
    }
    if (fence) continue
    const section = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)
    if (section) { finish(); heading = section[1]; continue }
    const question = /^\s*\d+\.\s+(.+?)\s*$/.exec(line)
    if (question) {
      finish()
      current = { id: `${version.hash}:${questions.length + 1}`, kind: 'short', prompt: question[1], options: [], source: { path: version.sourcePaths[0] ?? note.canonicalPath, hash: version.hash, heading, module }, warnings: [...sourceWarnings] }
      questions.push(current)
      continue
    }
    const globalWarning = /^\s*(?:>\s*)?(?:Peringatan|Warning)\s*:\s*(.+)$/i.exec(line)
    if (globalWarning) {
      sourceWarnings.push(globalWarning[1])
      for (const existing of questions) existing.warnings.push(globalWarning[1])
      continue
    }
    if (!current) continue
    const option = /^\s*(?:-\s+\[ \]\s+)?([A-Z])\.\s+(.+?)\s*$/i.exec(line)
    if (option) { current.options.push({ id: option[1].toUpperCase(), text: option[2] }); continue }
    const field = /^\s*(Kunci|Jawaban|Rubrik|Peringatan)\s*:\s*(.*?)\s*$/i.exec(line)
    if (!field) continue
    const value = field[2]
    switch (field[1].toLowerCase()) {
      case 'kunci':
      case 'jawaban':
        if (answer !== null) ambiguous = true
        answer = value
        break
      case 'rubrik':
        if (rubric !== null) ambiguous = true
        rubric = value
        break
      case 'peringatan': current.warnings.push(value || 'Peringatan sumber.'); break
    }
  }
  finish()
  if (fence) diagnostics.push('Blok kode tidak ditutup; konten setelah pembuka diabaikan.')
  if (questions.length) diagnostics.push('Ekstraksi hanya mendukung soal dan field satu baris. Cocokkan preview dengan sumber sebelum mulai; baris lanjutan tidak diekstrak.')
  return { questions, keys, diagnostics }
}

export function reviewPractice(set: PracticeSet, answers: Record<string, string>, id: string): PracticeAttempt {
  const savedAnswers = { ...answers }
  const reviews = set.questions.map((question): PracticeReview => {
    const matches = set.keys.filter(key => key.questionId === question.id)
    const key = matches.length === 1 ? matches[0] : undefined
    const response = savedAnswers[question.id] ?? ''
    let correct: boolean | null = null
    let feedback: string
    const estimate = question.kind === 'essay'
    if (estimate) {
      feedback = key?.rubric ? `Penilaian manual (estimasi). Rubrik: ${key.rubric}` : 'Penilaian manual (estimasi); rubrik tidak tersedia.'
    } else if (!key?.valid || key.answer === null || question.warnings.length || !response.trim()) {
      feedback = 'Tidak dapat dinilai secara definitif; periksa jawaban, kunci, dan peringatan sumber.'
    } else {
      correct = response.trim().toLocaleLowerCase() === key.answer.trim().toLocaleLowerCase()
      feedback = correct ? 'Jawaban sesuai kunci.' : 'Jawaban tidak sesuai kunci.'
    }
    return { questionId: question.id, correct, feedback, source: { ...question.source }, warnings: [...question.warnings], estimate }
  })
  return { id, answers: savedAnswers, reviews }
}
