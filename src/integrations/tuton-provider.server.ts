import { googleAccessToken, type GoogleEnv } from './google.server'
import { parseAcademicMetadata } from '../domain/metadata'
import { parseWorkbook, cellAt, cellValue } from '../domain/sheets'
import { detectTuton } from '../domain/tuton'
import type { WriteProvider, WriteRequest, WriteTarget } from '../domain/tuton-write'
import type { MetadataEnv } from './metadata.server'
import { tutonStructure } from '../domain/tuton-structure'

export type TutonEnv = GoogleEnv & MetadataEnv
export function createTutonProvider(env: TutonEnv): WriteProvider {
  async function workbook(owner: string) {
    if (!env.GOOGLE_SHEET_ID || !/^[A-Za-z0-9_-]{10,200}$/.test(env.GOOGLE_SHEET_ID)) throw new Error('not_configured')
    const token = await googleAccessToken(env, owner, 'sheetsWrite')
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}`)
    url.searchParams.set('includeGridData', 'true')
    url.searchParams.set('fields', 'spreadsheetId,sheets(properties(sheetId,title,sheetType),data(startRow,startColumn,rowData(values(userEnteredValue,effectiveValue,dataValidation))))')
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000), redirect: 'error' })
    if (!response.ok) throw new Error(response.status === 429 ? 'rate_limited' : response.status === 401 || response.status === 403 ? 'reconnect_required' : 'provider_error')
    const reader = response.body!.getReader(); const chunks: Uint8Array[] = []; let size = 0
    try { for (; ;) { const c = await reader.read(); if (c.done) break; size += c.value.byteLength; if (size > 2097152) throw new Error('source_too_large'); chunks.push(c.value) } } finally { await reader.cancel() }
    const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.byteLength }
    return { token, book: parseWorkbook(JSON.parse(new TextDecoder().decode(bytes))) }
  }
  async function resolve(owner: string, input: WriteRequest) {
    const row = await env.METADATA_DB?.prepare('SELECT config_json FROM academic_metadata WHERE owner_id = ?').bind(owner).first<{ config_json: string }>()
    if (!row) throw new Error('mapping_changed')
    const meta = parseAcademicMetadata(JSON.parse(row.config_json))
    const binding = meta.tutonBindings?.find(b => b.offeringId === input.offeringId)
    if (!binding || !('spreadsheetId' in binding) || binding.spreadsheetId !== env.GOOGLE_SHEET_ID) throw new Error('mapping_changed')
    const offering = meta.offerings.find(o => o.id === input.offeringId)!
    const course = meta.courses.find(c => c.id === offering.courseId)!
    const { token, book } = await workbook(owner)
    const sheet = book.sheets.find(s => s.properties.sheetId === binding.sheetId)
    if (!sheet) throw new Error('mapping_changed')
    const detected = detectTuton(sheet)
    if (detected.warnings.length || binding.structure !== tutonStructure(detected)) throw new Error('mapping_changed')
    const courses = detected.courses.filter(c => c.courseCode === course.courseCode && c.classId === offering.classId)
    const columns = detected.columns.filter(c => c.sessionNumber === input.sessionNumber && c.activity === input.activity)
    if (courses.length !== 1 || columns.length !== 1) throw new Error('mapping_changed')
    const r = courses[0]!.row, c = columns[0]!.column, cell = cellAt(sheet, r, c)
    if (cell?.userEnteredValue?.formulaValue || cell?.effectiveValue?.errorValue) throw new Error('formula_protected')
    const value = cellValue(cell)
    if (typeof value === 'string') throw new Error('invalid_value')
    if (/^nilai$/i.test(input.activity)) { if ((input.value !== null && typeof input.value !== 'number') || (value !== null && typeof value !== 'number')) throw new Error('invalid_value') }
    else {
      const validation = cell?.dataValidation
      if (!validation || typeof validation !== 'object' || !('condition' in validation) || !validation.condition || typeof validation.condition !== 'object' || !('type' in validation.condition) || validation.condition.type !== 'BOOLEAN' || 'values' in validation.condition || typeof input.value !== 'boolean' || (value !== null && typeof value !== 'boolean')) throw new Error('invalid_checkbox')
    }
    let column = '', n = c + 1; while (n > 0) { n--; column = String.fromCharCode(65 + n % 26) + column; n = Math.floor(n / 26) }
    const range = `'${sheet.properties.title!.replaceAll("'", "''")}'!${column}${r + 1}`
    return { token, value, range, sheetId: binding.sheetId, row: r, column: c }
  }
  return {
    async prepare(owner, input) {
      const current = await resolve(owner, input)
      if (current.value !== input.expectedValue) throw new Error('conflict')
      return { owner, input, range: current.range, sheetId: current.sheetId, row: current.row, column: current.column }
    },
    async write(target, value) {
      const { owner, input } = targetInput(target)
      const current = await resolve(owner, input)
      if (current.range !== target.range || current.row !== target.row || current.column !== target.column || current.value !== input.expectedValue) throw new Error('conflict')
      const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(current.range)}`)
      url.searchParams.set('valueInputOption', 'RAW')
      const response = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${current.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ range: current.range, majorDimension: 'ROWS', values: [[value === null ? '' : value]] }), signal: AbortSignal.timeout(15000), redirect: 'error' })
      if (!response.ok) throw new Error(response.status === 429 ? 'rate_limited' : response.status === 401 || response.status === 403 ? 'reconnect_required' : 'provider_error')
      await response.body?.cancel()
    },
    async read(target) {
      const { owner, input } = targetInput(target)
      const current = await resolve(owner, input)
      if (current.range !== target.range || current.row !== target.row || current.column !== target.column) throw new Error('mapping_changed')
      return current.value
    },
  }
}
function targetInput(target: WriteTarget) {
  if (typeof target.owner !== 'string' || !target.input || typeof target.input !== 'object') throw new Error('mapping_changed')
  // Target was persisted by prepare, never supplied by browser; parse again after restore.
  return { owner: target.owner, input: parseWriteRequest(target.input) }
}
import { parseWriteRequest } from '../domain/tuton-write'
