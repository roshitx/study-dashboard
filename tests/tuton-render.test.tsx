import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SheetsTracker } from '../src/components/sheets-tracker'
import { TutonOfferingEditor } from '../src/components/tuton-offering-editor'
import type { Sheet } from '../src/domain/sheets'

test('OBJECT worksheet explains the unsupported surface without fabricating tracker rows', () => {
  const html = renderToStaticMarkup(<SheetsTracker workbook={{ spreadsheetId: 'synthetic', sheets: [{ properties: { sheetId: 7, sheetType: 'OBJECT', title: 'Dashboard' } }] }} />)
  expect(html).toContain('bukan tabel GRID')
  expect(html).not.toContain('<table')
  expect(html).not.toContain('Simpan hubungan semester')
})

test('activity rendering distinguishes unchecked, numeric zero and absent grades', () => {
  const sheet: Sheet = { properties: { sheetId: 7, sheetType: 'GRID' }, data: [{ rowData: [{ values: [{ effectiveValue: { boolValue: false } }, { effectiveValue: { numberValue: 0 } }, {}] }] }] }
  const html = renderToStaticMarkup(<TutonOfferingEditor offeringId="synthetic" source={{ row: 0, courseCode: 'ABCD1234', classId: '20', name: 'Synthetic' }} columns={[
    { column: 0, sessionNumber: 1, activity: 'Presensi', dateLabel: null },
    { column: 1, sessionNumber: 1, activity: 'Nilai', dateLabel: null },
    { column: 2, sessionNumber: 2, activity: 'Nilai', dateLabel: null },
  ]} sheet={sheet} enabled={false} />)
  expect(html).toContain('Presensi · Belum dicentang')
  expect(html).toContain('Nilai · 0')
  expect(html).toContain('Nilai · Belum ada nilai')
  expect(html).toContain('Checkbox bukan bukti pengumpulan tugas')
})
