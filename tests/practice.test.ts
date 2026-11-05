import { expect, test } from 'bun:test'
import { indexSnapshot } from '../src/domain/snapshot-index'
import { extractPractice, reviewPractice } from '../src/domain/practice'

async function practice(text: string) {
  const index = await indexSnapshot([{ path: 'vault/University/lesson.md', bytes: new TextEncoder().encode(text) }], 'University', ['vault/University'])
  return extractPractice(index.notes[0], 0)
}

test('separates keys from questions, ignores frontmatter and fenced examples, and preserves provenance', async () => {
  const set = await practice('---\nmodule: Modul 2\nexample: "1. Not a question"\n---\n# Latihan\n```md\n1. Fake\nKunci: A\n```\n1. Pilih warna\n- [ ] A. Biru\n- [ ] B. Merah\nKunci: A\n')
  expect(set.questions).toHaveLength(1)
  expect(set.questions[0].kind).toBe('choice')
  expect(set.questions[0].options).toEqual([{ id: 'A', text: 'Biru' }, { id: 'B', text: 'Merah' }])
  expect(JSON.stringify(set.questions)).not.toContain('Kunci: A')
  expect(set.keys[0].answer).toBe('A')
  expect(set.questions[0].source).toMatchObject({ path: 'vault/University/lesson.md', heading: 'Latihan', module: 'Modul 2' })
  expect(set.questions[0].source.hash).toMatch(/^[a-f0-9]{64}$/)
  const review = reviewPractice(set, { [set.questions[0].id]: 'A' }, 'one').reviews[0]
  expect(review.correct).toBe(true)
  expect(review.source).toEqual(set.questions[0].source)
})

test('missing, invalid and explicitly warned keys never produce definitive scores', async () => {
  const set = await practice('# Latihan\n1. Missing\nA. One\nB. Two\n2. Invalid\nA. One\nB. Two\nKunci: C\n3. Warned\nA. One\nB. Two\nKunci: A\nPeringatan: Perlu diperiksa\n')
  expect(set.questions).toHaveLength(3)
  expect(set.keys[0].valid).toBe(false)
  expect(set.keys[1].valid).toBe(false)
  const answers = Object.fromEntries(set.questions.map(q => [q.id, 'A']))
  expect(reviewPractice(set, answers, 'one').reviews.map(r => r.correct)).toEqual([null, null, null])
  expect(set.questions[2].warnings).toContain('Perlu diperiksa')
})

test('source mismatch blocks every question regardless of its position', async () => {
  const set = await practice('---\ncourse_code: MKDI4201\nsource_course_code: MKWI4201\n---\n1. One\nJawaban: yes\n2. Two\nJawaban: no\n')
  expect(set.questions).toHaveLength(2)
  expect(set.questions.every(q => q.warnings.length > 0)).toBe(true)
  const answers = Object.fromEntries(set.questions.map((q, i) => [q.id, i ? 'no' : 'yes']))
  expect(reviewPractice(set, answers, 'one').reviews.map(r => r.correct)).toEqual([null, null])
})

test('essay rubric remains manual and estimated', async () => {
  const set = await practice('# Modul 3\n1. Jelaskan konsep\nRubrik: Jelaskan dua contoh\n')
  expect(set.questions[0].kind).toBe('essay')
  expect(set.keys[0].rubric).toBe('Jelaskan dua contoh')
  const review = reviewPractice(set, { [set.questions[0].id]: 'contoh' }, 'one').reviews[0]
  expect(review.correct).toBeNull()
  expect(review.estimate).toBe(true)
  expect(review.feedback).toContain('Jelaskan dua contoh')
})

test('attempts are independent snapshots and short answers are reviewed', async () => {
  const set = await practice('1. Sebutkan warna\nJawaban: Biru\n')
  const id = set.questions[0].id
  expect(set.questions[0].kind).toBe('short')
  const answers = { [id]: 'biru' }
  const first = reviewPractice(set, answers, 'first')
  answers[id] = 'merah'
  const second = reviewPractice(set, answers, 'second')
  expect(first.answers[id]).toBe('biru')
  expect(first.reviews[0].correct).toBe(true)
  expect(second.reviews[0].correct).toBe(false)
  expect(second.id).toBe('second')
})

test('warning outside questions blocks earlier and later keys', async () => {
  const set = await practice('Peringatan: Kunci cetak tidak cocok\n# Latihan\n1. Satu\nJawaban: benar\n2. Dua\nJawaban: benar\n')
  const answers = Object.fromEntries(set.questions.map(q => [q.id, 'benar']))
  expect(reviewPractice(set, answers, 'warned').reviews.map(r => r.correct)).toEqual([null, null])
  expect(set.questions.every(q => q.warnings.includes('Kunci cetak tidak cocok'))).toBe(true)
})
