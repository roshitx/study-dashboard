import { test } from 'bun:test'
import assert from 'node:assert/strict'
import { classifyCheckbox, isSubmitted, parseGrade, parseRegistrationCode, resolveNoteLink } from '../src/domain/rules.ts'

test('Kode registrasi menyimpan identitas kelas terpisah', () => {
  assert.deepEqual(parseRegistrationCode('MKKI4201.1045'), { courseCode: 'MKKI4201', classId: '1045' })
  assert.deepEqual(parseRegistrationCode('MKDI4201'), { courseCode: 'MKDI4201', classId: null })
  assert.throws(() => parseRegistrationCode('MKWI4201 + MKDI4201'))
})
test('Nilai kosong bukan nol; nilai invalid ditolak', () => {
  assert.equal(parseGrade(''), null); assert.equal(parseGrade('   '), null)
  assert.equal(parseGrade(0), 0); assert.equal(parseGrade('87.00'), 87)
  assert.throws(() => parseGrade('FALSE')); assert.throws(() => parseGrade(101))
})
test('Draf siap tidak berarti terkirim ke LMS', () => {
  assert.equal(isSubmitted('ready'), false); assert.equal(isSubmitted('submitted'), true)
})
test('Pilihan jawaban dan checkbox ambigu tidak menjadi task', () => {
  assert.equal(classifyCheckbox({ line: '- [ ] A. Thank you', context: 'quiz' }), 'answer_option')
  assert.equal(classifyCheckbox({ line: '- [ ] Baca modul', context: 'unknown' }), 'unclassified')
  assert.equal(classifyCheckbox({ line: '- [x] Baca modul', context: 'task-list' }), 'task')
})
const paths = ['S1/EN/00 - Course Hub.md', 'S2/EN/00 - Course Hub.md', 'S2/EN/Materi/L01.md']
test('Wikilink relatif dan prefix vault dapat diresolusikan', () => {
  assert.deepEqual(resolveNoteLink('../00 - Course Hub|Hub', paths[2], paths), { status: 'found', path: paths[1] })
  assert.deepEqual(resolveNoteLink('6 - Main Notes/Workspaces/University/S2/EN/Materi/L01#Heading', paths[1], paths, '6 - Main Notes/Workspaces/University'), { status: 'found', path: paths[2] })
})
test('Nama hub berulang tidak dipilih diam-diam; traversal keluar ditolak', () => {
  assert.deepEqual(resolveNoteLink('00 - Course Hub', 'Other/Note.md', paths), { status: 'ambiguous' })
  assert.deepEqual(resolveNoteLink('../../../private', 'Other/Note.md', paths), { status: 'invalid' })
  assert.deepEqual(resolveNoteLink('2 - Source Material/BMP', 'Other/Note.md', paths), { status: 'missing' })
})
