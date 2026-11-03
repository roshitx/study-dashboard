import { test, expect } from 'bun:test'
import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js'
import { importLocalFiles, IMPORT_LIMITS } from '../src/integrations/local-import'

test('mixed ZIP preserves valid bytes while rejecting traversal, symlinks and invalid UTF-8', async () => {
  const writer = new ZipWriter(new BlobWriter('application/zip'), { useWebWorkers: false })
  await writer.add('valid.md', new TextReader('# Valid\r\n'))
  await writer.add('../escape.md', new TextReader('unsafe'))
  await writer.add('link.md', new TextReader('valid.md'), { unixMode: 0o120777 })
  await writer.add('invalid.md', new Uint8ArrayReader(new Uint8Array([0xff])))
  const file = new File([await writer.close()], 'mixed.zip')
  const before = await file.arrayBuffer()
  const report = await importLocalFiles([file])
  expect(report.files.map(f => f.path)).toEqual(['valid.md'])
  expect(new TextDecoder().decode(report.files[0].bytes)).toBe('# Valid\r\n')
  expect(report.diagnostics.map(d => d.path).sort()).toEqual(['../escape.md', 'invalid.md', 'link.md'])
  expect(await file.arrayBuffer()).toEqual(before)
})

test('rejects oversized compressed input and expansion, continues to valid note', async () => {
  const tooLarge = new File([new Uint8Array(IMPORT_LIMITS.inputBytes + 1)], 'large.zip')
  expect((await importLocalFiles([tooLarge])).files).toEqual([])
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false })
  await writer.add('bomb.md', new TextReader('x'.repeat(IMPORT_LIMITS.fileBytes + 1)))
  await writer.add('ok.md', new TextReader('safe'))
  const report = await importLocalFiles([new File([await writer.close()], 'bomb.zip')])
  expect(report.files.map(f => f.path)).toEqual(['ok.md'])
  expect(report.diagnostics[0].path).toBe('bomb.md')
})

test('direct files report invalid data without losing valid siblings; broken ZIP is diagnostic', async () => {
  const report = await importLocalFiles([new File(['ok'], 'ok.md'), new File(['a\0b'], 'binary.md'), new File(['bad zip'], 'broken.zip')])
  expect(report.files.map(f => f.path)).toEqual(['ok.md'])
  expect(report.diagnostics.map(d => d.path)).toEqual(['binary.md', 'broken.zip'])
})

test('enforces entry count and does not trust forged uncompressed size', async () => {
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false })
  await writer.add('forged.md', new TextReader('x'.repeat(IMPORT_LIMITS.fileBytes + 1)))
  await writer.add('safe.md', new TextReader('safe'))
  const bytes = new Uint8Array(await (await writer.close()).arrayBuffer())
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < bytes.length - 30; i++) {
    if (view.getUint32(i, true) === 0x02014b50) { view.setUint32(i + 24, 1, true); break }
  }
  const report = await importLocalFiles([new File([bytes], 'forged.zip')])
  expect(report.files.map(f => f.path)).toEqual(['safe.md'])
  expect(report.diagnostics[0].path).toBe('forged.md')
  expect(report.extractedBytes).toBeLessThanOrEqual(IMPORT_LIMITS.fileBytes + 4)
  const many = await importLocalFiles(Array.from({ length: IMPORT_LIMITS.entries + 1 }, () => new File(['ok'], 'a.md')))
  expect(many.files).toEqual([])
  expect(many.diagnostics[0].reason).toContain('2.000')
})
