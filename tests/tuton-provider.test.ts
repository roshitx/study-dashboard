import { test, expect } from 'bun:test'
import { createTutonProvider } from '../src/integrations/tuton-provider.server'
import { protectGoogleToken } from '../src/integrations/google.server'
import { detectTuton } from '../src/domain/tuton'
import { tutonStructure } from '../src/domain/tuton-structure'
import type { Sheet } from '../src/domain/sheets'
import type { TutonEnv } from '../src/integrations/tuton-provider.server'
const text = (stringValue: string) => ({ effectiveValue: { stringValue } })
test('provider preserves native checkbox/zero/clear, rejects drift, formulas and stale values', async () => {
  const sheet: Sheet = {
    properties: { sheetId: 7, title: 'Tuton', sheetType: 'GRID' }, data: [{
      rowData: [
        { values: [text('Kode'), text('Nama Mata Kuliah'), text('Sesi 1')] },
        { values: [{}, {}, text('tanggal sumber')] },
        { values: [{}, {}, text('Diskusi'), text('Nilai')] },
        { values: [text('MKKI4201.1045'), text('Sintetis'), { userEnteredValue: { boolValue: false }, dataValidation: { condition: { type: 'BOOLEAN' }, strict: true } }, { userEnteredValue: { numberValue: 5 } }] },
      ]
    }]
  }
  const metadata = { semesters: [{ id: 's', number: 1, academicPeriod: null, active: true }], courses: [{ id: 'c', courseCode: 'MKKI4201', sourceCourseCode: null, name: 'Sintetis' }], offerings: [{ id: 'o', semesterId: 's', courseId: 'c', classId: '1045', credits: null }], tutonBindings: [{ offeringId: 'o', sheetId: 7, sourceCourse: 'MKKI4201.1045', spreadsheetId: 'synthetic-workbook', structure: tutonStructure(detectTuton(sheet)) }] }
  const env: TutonEnv = { GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic', GOOGLE_TOKEN_KEY: 'ab'.repeat(32), GOOGLE_SHEET_ID: 'synthetic-workbook' }
  const cipher = await protectGoogleToken(env, 'owner', 'sheetsWrite', 'synthetic-refresh')
  env.AUTH_DB = { prepare() { return { bind() { return this }, async first<T>() { return { encrypted_token: cipher } as T }, async run() { } } } }
  env.METADATA_DB = { prepare() { return { bind() { return this }, async first<T>() { return { config_json: JSON.stringify(metadata) } as T } } } }
  const original = globalThis.fetch
  let dispatches = 0
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input))
    if (url.hostname === 'oauth2.googleapis.com') return Response.json({ access_token: 'synthetic-access', token_type: 'Bearer', expires_in: 3600 })
    if (init?.method === 'PUT') {
      dispatches++
      const body = JSON.parse(String(init.body))
      const value = body.values[0][0], index = body.range.endsWith('C4') ? 2 : 3
      sheet.data![0]!.rowData![3]!.values![index]!.userEnteredValue = value === '' ? {} : typeof value === 'boolean' ? { boolValue: value } : { numberValue: value }
      return Response.json({ updatedCells: 1 })
    }
    return Response.json({ spreadsheetId: env.GOOGLE_SHEET_ID, sheets: [sheet] })
  }) as typeof fetch
  try {
    const provider = createTutonProvider(env), base = { operationId: '123e4567-e89b-42d3-a456-426614174000', offeringId: 'o', sessionNumber: 1, activity: 'Diskusi', expectedValue: false, value: true }
    const target = await provider.prepare('owner', base)
    await provider.write(target, true); expect(await provider.read(target)).toBe(true)
    expect(sheet.data![0]!.rowData![3]!.values![2]!.dataValidation).toEqual({ condition: { type: 'BOOLEAN' }, strict: true })
    await expect(provider.prepare('owner', base)).rejects.toThrow('conflict')
    for (const [expectedValue, value] of [[5, 0], [0, null]] as const) {
      const grade = await provider.prepare('owner', { ...base, activity: 'Nilai', expectedValue, value })
      await provider.write(grade, value); expect(await provider.read(grade)).toBe(value)
    }
    sheet.data![0]!.rowData![3]!.values![3]!.userEnteredValue = { formulaValue: '=1+1' }
    await expect(provider.prepare('owner', { ...base, activity: 'Nilai', expectedValue: null, value: 0 })).rejects.toThrow('formula_protected')
    sheet.data![0]!.rowData!.unshift({ values: [] })
    await expect(provider.prepare('owner', { ...base, expectedValue: true })).rejects.toThrow('mapping_changed')
    expect(dispatches).toBe(3)
  } finally { globalThis.fetch = original }
})
