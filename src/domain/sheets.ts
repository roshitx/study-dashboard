export interface SheetCell {
  userEnteredValue?: { stringValue?: string; numberValue?: number; boolValue?: boolean; formulaValue?: string }
  effectiveValue?: { stringValue?: string; numberValue?: number; boolValue?: boolean; errorValue?: { type?: string; message?: string } }
  formattedValue?: string
  dataValidation?: unknown
}
export interface Sheet {
  properties: { sheetId: number; title?: string; sheetType?: string }
  data?: { startRow?: number; startColumn?: number; rowData?: { values?: SheetCell[] }[] }[]
}
export interface Workbook { spreadsheetId: string; properties?: { title?: string }; sheets: Sheet[] }
export interface SheetMapping {
  spreadsheetId: string; sheetId: number; semesterId: string; offeringId: string; courseCode: string; classId: string | null
  headerRow: number; courseColumn: number; courseHeader: string; row: number; sourceCourse: string
  valueColumn: number; valueHeader: string; sessionNumber: number; activity: string
}
export function cellAt(sheet: Sheet, row: number, column: number): SheetCell | undefined {
  for (const grid of sheet.data ?? []) {
    const r = row - (grid.startRow ?? 0), c = column - (grid.startColumn ?? 0)
    if (r >= 0 && c >= 0) { const cell = grid.rowData?.[r]?.values?.[c]; if (cell) return cell }
  }
}
export function cellValue(cell?: SheetCell): string | number | boolean | null {
  const value = cell?.effectiveValue ?? cell?.userEnteredValue
  if (value && 'errorValue' in value && value.errorValue) throw new Error('cell_error')
  if (typeof value?.boolValue === 'boolean') return value.boolValue
  if (typeof value?.numberValue === 'number') return value.numberValue
  if (typeof value?.stringValue === 'string') return value.stringValue === '' ? null : value.stringValue
  return null
}
export function readMappedActivity(workbook: Workbook, mapping: SheetMapping) {
  if (![mapping.sheetId, mapping.headerRow, mapping.courseColumn, mapping.row, mapping.valueColumn].every(n => Number.isSafeInteger(n) && n >= 0) || !Number.isSafeInteger(mapping.sessionNumber) || mapping.sessionNumber < 1 || ![mapping.semesterId, mapping.offeringId, mapping.courseCode, mapping.sourceCourse, mapping.courseHeader, mapping.valueHeader, mapping.activity].every(s => typeof s === 'string' && s.trim().length > 0) || mapping.row === mapping.headerRow) throw new Error('invalid_mapping')
  const sheet = workbook.sheets.find(s => s.properties.sheetId === mapping.sheetId)
  if (!sheet || workbook.spreadsheetId !== mapping.spreadsheetId) throw new Error('mapping_changed')
  if (sheet.properties.sheetType !== 'GRID') throw new Error('unsupported_sheet_type')
  if (cellValue(cellAt(sheet, mapping.headerRow, mapping.courseColumn)) !== mapping.courseHeader || cellValue(cellAt(sheet, mapping.headerRow, mapping.valueColumn)) !== mapping.valueHeader || cellValue(cellAt(sheet, mapping.row, mapping.courseColumn)) !== mapping.sourceCourse) throw new Error('mapping_changed')
  return { ...mapping, value: cellValue(cellAt(sheet, mapping.row, mapping.valueColumn)) }
}

export function parseWorkbook(value: unknown): Workbook {
  function object(v: unknown): Record<string, unknown> {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('invalid_workbook')
    return v as Record<string, unknown>
  }
  function array(v: unknown): unknown[] { if (!Array.isArray(v)) throw new Error('invalid_workbook'); return v }
  const root = object(value)
  if (typeof root.spreadsheetId !== 'string') throw new Error('invalid_workbook')
  for (const item of array(root.sheets)) {
    const sheet = object(item), properties = object(sheet.properties)
    if (!Number.isSafeInteger(properties.sheetId) || typeof properties.sheetType !== 'string' || (properties.title !== undefined && typeof properties.title !== 'string')) throw new Error('invalid_workbook')
    for (const item of array(sheet.data ?? [])) {
      const grid = object(item)
      for (const key of ['startRow', 'startColumn']) if (grid[key] !== undefined && (!Number.isSafeInteger(grid[key]) || Number(grid[key]) < 0)) throw new Error('invalid_workbook')
      for (const row of array(grid.rowData ?? [])) for (const item of array(object(row).values ?? [])) {
        const cell = object(item)
        if (cell.formattedValue !== undefined && typeof cell.formattedValue !== 'string') throw new Error('invalid_workbook')
        for (const key of ['effectiveValue', 'userEnteredValue']) {
          if (cell[key] === undefined) continue
          const v = object(cell[key])
          for (const [field, type] of [['stringValue', 'string'], ['numberValue', 'number'], ['boolValue', 'boolean'], ['formulaValue', 'string']] as const) if (v[field] !== undefined && typeof v[field] !== type) throw new Error('invalid_workbook')
          if (v.errorValue !== undefined) object(v.errorValue)
        }
      }
    }
  }
  if (root.properties !== undefined) { const p = object(root.properties); if (p.title !== undefined && typeof p.title !== 'string') throw new Error('invalid_workbook') }
  // Native Google shape checked above; retain source metadata without normalization.
  return value as Workbook
}
