import { expect, test } from 'bun:test'
import { detectTuton } from '../src/domain/tuton'
import type { Sheet } from '../src/domain/sheets'
const cell = (stringValue: string) => ({ effectiveValue: { stringValue } })
const sheet: Sheet = {
  properties: { sheetId: 7, sheetType: 'GRID' }, data: [{
    rowData: [
      { values: [cell('Kode'), cell('Nama Mata Kuliah'), cell('Sesi 1'), {}, {}, {}, cell('Sesi 2')] },
      { values: [{}, {}, cell('14 September 2026 - 20 September 2026'), {}, {}, {}, cell('21 September 2026 - 27 September 2026')] },
      { values: [{}, {}, cell('Baca Modul'), cell('Presensi'), cell('Diskusi 1'), cell('Nilai'), cell('Baca Modul'), cell('Presensi'), cell('Diskusi 2'), cell('Nilai')] },
      { values: [cell('MKKI4201.1045'), cell('Statistika'), { effectiveValue: { boolValue: false } }] },
      { values: [cell('* Mata Kuliah Berpraktik')] },
    ]
  }]
}
test('recognizes merged-style session groups without equating modules and sessions', () => {
  const result = detectTuton(sheet)
  expect(result.courses).toEqual([{ row: 3, courseCode: 'MKKI4201', classId: '1045', name: 'Statistika' }])
  expect(result.columns).toHaveLength(8)
  expect(result.columns.find(c => c.column === 8)).toEqual({ column: 8, sessionNumber: 2, activity: 'Diskusi 2', dateLabel: '21 September 2026 - 27 September 2026' })
  expect(result.warnings).toEqual([])
})
test('does not invent GRID rows for OBJECT or silently accept duplicate identity headers', () => {
  expect(detectTuton({ properties: { sheetId: 1, sheetType: 'OBJECT' } }).warnings).toEqual(['Worksheet bukan GRID.'])
  const copy = structuredClone(sheet)
  copy.data![0]!.rowData!.push({ values: [cell('Kode'), cell('Nama Mata Kuliah')] })
  expect(detectTuton(copy).courses).toEqual([])
})
