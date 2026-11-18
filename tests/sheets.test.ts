import { expect, test } from 'bun:test'
import { parseWorkbook, readMappedActivity, type SheetMapping } from '../src/domain/sheets'
const workbook = { spreadsheetId: 'synthetic', sheets: [{ properties: { sheetId: 9, title: 'Tracker', sheetType: 'GRID' }, data: [{ startRow: 4, startColumn: 2, rowData: [{ values: [{ effectiveValue: { stringValue: 'Kode' } }, { effectiveValue: { stringValue: 'Nilai sesi 3' } }] }, { values: [{ effectiveValue: { stringValue: 'ABCD1234.1045' } }, { effectiveValue: { boolValue: false } }] }] }] }] }
const mapping: SheetMapping = { spreadsheetId: 'synthetic', sheetId: 9, semesterId: 'semester-3', offeringId: 'offering-abc', courseCode: 'ABCD1234', classId: '1045', headerRow: 4, courseColumn: 2, courseHeader: 'Kode', row: 5, sourceCourse: 'ABCD1234.1045', valueColumn: 3, valueHeader: 'Nilai sesi 3', sessionNumber: 3, activity: 'Diskusi' }
test('mapping reads sparse native cells and keeps false distinct from zero and null', () => {
  expect(readMappedActivity(workbook, mapping).value).toBe(false)
  const copy = structuredClone(workbook)
  copy.sheets[0]!.data[0]!.rowData[1]!.values[1] = { effectiveValue: { numberValue: 0 } } as never
  expect(readMappedActivity(copy, mapping).value).toBe(0)
  copy.sheets[0]!.data[0]!.rowData[1]!.values.pop()
  expect(readMappedActivity(copy, mapping).value).toBeNull()
  expect(readMappedActivity(workbook, mapping)).toMatchObject({ semesterId: 'semester-3', offeringId: 'offering-abc', courseCode: 'ABCD1234', classId: '1045', sessionNumber: 3 })
})
test('changed header or course identity invalidates mapping instead of reading another target', () => {
  expect(() => readMappedActivity(workbook, { ...mapping, valueHeader: 'Different' })).toThrow('mapping_changed')
  expect(() => readMappedActivity(workbook, { ...mapping, sourceCourse: 'ABCD9999' })).toThrow('mapping_changed')
  expect(() => readMappedActivity(workbook, { ...mapping, spreadsheetId: 'other' })).toThrow('mapping_changed')
  expect(() => readMappedActivity(workbook, { ...mapping, row: -1 })).toThrow('invalid_mapping')
})
test('OBJECT worksheet never masquerades as empty tracker', () => {
  const object = { spreadsheetId: 'synthetic', sheets: [{ properties: { sheetId: 9, sheetType: 'OBJECT' } }] }
  expect(() => readMappedActivity(object, mapping)).toThrow('unsupported_sheet_type')
})

test('provider workbook rejects malformed native values before rendering', () => {
  expect(() => parseWorkbook({ spreadsheetId: 'synthetic', sheets: [{ properties: { sheetId: 1, sheetType: 'GRID' }, data: [{ rowData: [{ values: [{ effectiveValue: { boolValue: 'false' } }] }] }] }] })).toThrow('invalid_workbook')
  expect(parseWorkbook(workbook).spreadsheetId).toBe('synthetic')
})
