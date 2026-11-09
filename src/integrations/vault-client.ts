export class VaultConflictError extends Error { }
export class VaultUncertainError extends Error { }
export interface VaultEntry { key: string; path: string; size: number }

export class VaultSession {
  private worker: Worker | null = null
  private controller: AbortController | null = null
  private generation = 0
  private sequence = 0
  private entries: VaultEntry[] = []
  private unlocked = false
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()

  lock() {
    this.generation++
    this.unlocked = false
    this.entries = []
    this.controller?.abort()
    this.controller = null
    this.worker?.terminate()
    this.worker = null
    for (const job of this.pending.values()) job.reject(new Error('Vault terkunci.'))
    this.pending.clear()
  }

  private call(action: string, payload: object): Promise<unknown> {
    const worker = this.worker
    if (!worker) return Promise.reject(new Error('Vault terkunci.'))
    const { promise, resolve, reject } = Promise.withResolvers<unknown>()
    const id = ++this.sequence
    this.pending.set(id, { resolve, reject })
    worker.postMessage({ id, action, ...payload })
    return promise
  }

  private async ciphertext(key: string, signal: AbortSignal) {
    const response = await fetch('/api/vault/object?' + new URLSearchParams({ key }), { cache: 'no-store', signal })
    if (!response.ok || !response.body) throw new Error('Baca vault gagal.')
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const item = await reader.read()
        if (item.done) break
        size += item.value.length
        if (size > 8 * 1024 ** 2) throw new Error('Batas vault terlampaui.')
        chunks.push(item.value)
      }
    } finally { await reader.cancel(); reader.releaseLock() }
    const result = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length }
    const revision = response.headers.get('ETag')
    if (!revision) throw new Error('Revisi vault tidak tersedia.')
    return { bytes: result, revision }
  }

  async unlock(password: string): Promise<VaultEntry[]> {
    this.lock()
    const generation = this.generation
    const controller = new AbortController()
    this.controller = controller
    this.worker = new Worker(new URL('./vault-crypt.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = event => {
      const job = this.pending.get(event.data.id)
      if (!job) return
      this.pending.delete(event.data.id)
      if (event.data.ok) job.resolve(event.data.value)
      else job.reject(new Error('Password atau format vault tidak cocok.'))
    }
    this.worker.onerror = () => this.lock()
    try {
      const objects: { key: string; size: number }[] = []
      const seen = new Set<string>()
      const cursors = new Set<string>()
      let cursor: string | null = null
      do {
        const response: Response = await fetch('/api/vault/list' + (cursor ? '?' + new URLSearchParams({ cursor }) : ''), { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Vault tidak tersedia.')
        const page: { objects: { key: string; size: number }[]; cursor: string | null } = await response.json()
        if (!Array.isArray(page.objects) || page.objects.length > 100 || !(page.cursor === null || typeof page.cursor === 'string' && page.cursor.length > 0 && page.cursor.length <= 4096)) throw new Error('Daftar vault tidak valid.')
        for (const entry of page.objects) {
          if (typeof entry.key !== 'string' || entry.key.length > 4096 || !Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > 8 * 1024 ** 2 || seen.has(entry.key)) throw new Error('Daftar vault tidak valid.')
          seen.add(entry.key)
          objects.push({ key: entry.key, size: entry.size })
        }
        if (objects.length > 2000) throw new Error('Batas vault terlampaui.')
        cursor = page.cursor
        if (cursor && cursors.has(cursor)) throw new Error('Daftar vault berulang.')
        if (cursor) cursors.add(cursor)
      } while (cursor)
      if (generation !== this.generation) throw new Error('Vault terkunci.')
      const paths = await this.call('unlock', { password, names: objects.map(o => o.key) }) as string[]
      if (generation !== this.generation) throw new Error('Vault terkunci.')
      const entries = objects.map((object, i) => ({ ...object, path: paths[i]! })).filter(entry => entry.path.toLowerCase().endsWith('.md'))
      if (!entries.length || new Set(entries.map(entry => entry.path)).size !== entries.length) throw new Error('Vault uji harus berisi Markdown terenkripsi.')
      const bytes = await this.ciphertext(entries[0]!.key, controller.signal)
      if (generation !== this.generation) throw new Error('Vault terkunci.')
      await this.call('read', { bytes: bytes.bytes })
      if (generation !== this.generation) throw new Error('Vault terkunci.')
      this.entries = entries
      this.unlocked = true
      return [...entries]
    } catch {
      if (generation === this.generation) this.lock()
      throw new Error('Unlock gagal. Periksa password, format dan koneksi vault uji.')
    }
  }

  async read(key: string): Promise<{ path: string; bytes: Uint8Array; revision: string }> {
    const entry = this.entries.find(item => item.key === key)
    if (!this.unlocked || !entry || !this.controller) throw new Error('Vault terkunci.')
    const generation = this.generation
    const bytes = await this.ciphertext(key, this.controller.signal)
    if (generation !== this.generation) throw new Error('Vault terkunci.')
    const plain = await this.call('read', { bytes: bytes.bytes }) as Uint8Array
    if (generation !== this.generation) throw new Error('Vault terkunci.')
    return { path: entry.path, bytes: plain, revision: bytes.revision }
  }

  private active(key: string) {
    if (!this.unlocked || !this.entries.some(entry => entry.key === key) || !this.controller) throw new Error('Vault terkunci.')
    return { generation: this.generation, signal: this.controller.signal }
  }

  private async mutation(url: string, init: RequestInit, generation: number) {
    let response: Response
    try { response = await fetch(url, { ...init, cache: 'no-store', signal: this.controller?.signal }) }
    catch { throw new VaultUncertainError('Hasil save belum pasti. Baca remote sebelum mencoba lagi.') }
    if (generation !== this.generation) throw new VaultUncertainError('Vault terkunci; hasil save perlu diperiksa ulang.')
    if (response.status === 409) throw new VaultConflictError('Revisi remote berubah.')
    if (response.status >= 500) throw new VaultUncertainError('Hasil save belum pasti. Baca remote sebelum mencoba lagi.')
    if (!response.ok) throw new Error('Operasi vault ditolak.')
    let value: { revision?: unknown }
    try { value = await response.json() as { revision?: unknown } }
    catch { throw new VaultUncertainError('Revisi save belum terkonfirmasi.') }
    if (!value || typeof value.revision !== 'string' || !value.revision || generation !== this.generation) throw new VaultUncertainError('Revisi save belum terkonfirmasi.')
    return { revision: value.revision }
  }

  async save(key: string, bytes: Uint8Array, expectedRevision: string): Promise<{ revision: string }> {
    const { generation } = this.active(key)
    const ciphertext = await this.call('encrypt', { bytes }) as Uint8Array
    if (generation !== this.generation) throw new Error('Vault terkunci.')
    return this.mutation('/api/vault/object?' + new URLSearchParams({ key }), {
      method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'If-Match': expectedRevision }, body: ciphertext as BodyInit,
    }, generation)
  }

  async history(key: string): Promise<{ id: string; revision: string }[]> {
    const { generation, signal } = this.active(key)
    const response = await fetch('/api/vault/history?' + new URLSearchParams({ key }), { cache: 'no-store', signal })
    if (!response.ok || generation !== this.generation) throw new Error('Histori tidak tersedia.')
    const value = await response.json() as { items?: { id: string; revision: string }[] }
    if (!value || generation !== this.generation || !Array.isArray(value.items) || value.items.length > 100 || value.items.some(item => !item || typeof item.id !== 'string' || typeof item.revision !== 'string')) throw new Error('Histori tidak valid.')
    return value.items
  }

  async recover(key: string, id: string, expectedRevision: string): Promise<{ revision: string }> {
    const { generation } = this.active(key)
    return this.mutation('/api/vault/history?' + new URLSearchParams({ key, id }), {
      method: 'POST', headers: { 'If-Match': expectedRevision },
    }, generation)
  }
}
