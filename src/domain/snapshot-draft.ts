import type { IndexedVersion, SnapshotIndex } from './snapshot-index'
import { BlobWriter, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js'

export function draftBody(version: IndexedVersion): string {
  const raw = new TextDecoder('utf-8', { ignoreBOM: true }).decode(version.bytes)
  const body = version.rawFrontmatter ? raw.slice(version.rawFrontmatter.length) : raw.replace(/^\uFEFF/, '')
  return body.replace(/\r\n/g, '\n')
}

export function draftBytes(version: IndexedVersion, body: string): Uint8Array {
  if (body === draftBody(version)) return version.bytes
  const raw = new TextDecoder('utf-8', { ignoreBOM: true }).decode(version.bytes)
  const prefix = version.rawFrontmatter ?? (raw.startsWith('\uFEFF') ? '\uFEFF' : '')
  const newline = raw.includes('\r\n') ? '\r\n' : '\n'
  const bytes = new TextEncoder().encode(prefix + body.replace(/\r\n/g, '\n').replace(/\n/g, newline))
  if (bytes.length > 2 * 1024 ** 2 || body.includes('\0')) throw new Error('Draf melebihi 2 MiB atau mengandung NUL; tidak disimpan.')
  return bytes
}

// One archive per version layer keeps canonical paths intact without duplicate ZIP entries.
export async function exportSnapshotLayer(index: SnapshotIndex, layer: number): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter('application/zip'), { useWebWorkers: false })
  for (const note of index.notes) {
    const version = note.versions[layer]
    if (version) await writer.add(note.canonicalPath, new Uint8ArrayReader(version.bytes), { useWebWorkers: false })
  }
  return writer.close()
}
