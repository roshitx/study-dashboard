import { BlobReader, ZipReader } from '@zip.js/zip.js'

export const IMPORT_LIMITS = { inputBytes: 32 * 1024 ** 2, entries: 2000, outputBytes: 64 * 1024 ** 2, fileBytes: 2 * 1024 ** 2 } as const
export interface ImportedFile { path: string; bytes: Uint8Array }
export interface ImportDiagnostic { path: string; reason: string }
export interface ImportReport { files: ImportedFile[]; diagnostics: ImportDiagnostic[]; entries: number; extractedBytes: number }

export async function importLocalFiles(inputs: readonly File[]): Promise<ImportReport> {
  const report: ImportReport = { files: [], diagnostics: [], entries: 0, extractedBytes: 0 }
  const reject = (path: string, reason: string) => report.diagnostics.push({ path, reason })
  if (inputs.length > IMPORT_LIMITS.entries || inputs.reduce((sum, f) => sum + f.size, 0) > IMPORT_LIMITS.inputBytes) {
    reject('Pilihan file', 'Melebihi batas 2.000 file atau 32 MiB input.'); return report
  }
  function validate(path: string, size: number): boolean {
    if (!path || path.startsWith('/') || path.includes('\\') || /[\u0000-\u001f\u007f:]/u.test(path) || path.split('/').some(p => p === '..' || p === '.' || !p)) {
      reject(path, 'Path tidak aman.'); return false
    }
    if (!/\.md$/i.test(path)) { reject(path, 'Hanya Markdown UTF-8 diterima; lampiran belum diimpor.'); return false }
    if (!Number.isSafeInteger(size) || size < 0 || size > IMPORT_LIMITS.fileBytes) { reject(path, 'Ukuran file melebihi 2 MiB atau tidak valid.'); return false }
    return true
  }
  function accept(path: string, bytes: Uint8Array) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      if (text.includes('\0')) throw new Error('binary')
      report.files.push({ path, bytes })
    } catch { reject(path, 'Bukan Markdown UTF-8 yang valid (atau mengandung NUL).') }
  }
  for (const input of inputs) {
    if (report.entries >= IMPORT_LIMITS.entries || report.extractedBytes >= IMPORT_LIMITS.outputBytes) { reject(input.name, 'Batas sesi import tercapai.'); break }
    if (!/\.zip$/i.test(input.name)) {
      report.entries++
      if (!validate(input.name, input.size)) continue
      if (input.size > IMPORT_LIMITS.outputBytes - report.extractedBytes) { reject(input.name, 'Batas ekstraksi sesi 64 MiB tercapai.'); continue }
      try { const bytes = new Uint8Array(await input.arrayBuffer()); report.extractedBytes += bytes.length; accept(input.name, bytes) }
      catch { reject(input.name, 'File tidak dapat dibaca.') }
      continue
    }
    const reader = new ZipReader(new BlobReader(input), { useWebWorkers: false, filenameValidation: 'tolerant' })
    try {
      for await (const entry of reader.getEntriesGenerator()) {
        report.entries++
        if (report.entries > IMPORT_LIMITS.entries) { reject(input.name, 'ZIP melebihi batas 2.000 entri sesi.'); return report }
        const path = entry.filename
        if (entry.symlink || (entry.unixMode !== undefined && (entry.unixMode & 0o170000) !== 0 && (entry.unixMode & 0o170000) !== 0o100000 && !entry.directory)) { reject(path, 'Symlink atau tipe file khusus ditolak.'); continue }
        if (entry.directory) continue
        if (!validate(path, entry.uncompressedSize)) continue
        if (entry.encrypted) { reject(path, 'ZIP terenkripsi tidak didukung.'); continue }
        if (entry.uncompressedSize > IMPORT_LIMITS.outputBytes - report.extractedBytes) { reject(path, 'Batas ekstraksi sesi 64 MiB tercapai.'); continue }
        const chunks: Uint8Array[] = []
        let size = 0
        try {
          const sink = new WritableStream<Uint8Array>({
            write(chunk) {
              if (chunk.length > IMPORT_LIMITS.fileBytes - size || chunk.length > IMPORT_LIMITS.outputBytes - report.extractedBytes) throw new Error('limit')
              size += chunk.length; report.extractedBytes += chunk.length; chunks.push(chunk)
            }
          })
          await entry.getData(sink, { checkSignature: true, useWebWorkers: false })
          if (size !== entry.uncompressedSize) throw new Error('size')
          const bytes = new Uint8Array(size)
          let offset = 0
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
          accept(path, bytes)
        } catch { reject(path, 'Ekstraksi gagal: batas ukuran, checksum atau data ZIP tidak valid.') }
      }
    } catch { reject(input.name, 'ZIP rusak atau tidak didukung.') }
    finally { await reader.close() }
  }
  return report
}
