import { Cipher } from '@fyears/rclone-crypt'

let cipher: Cipher | null = null
self.onmessage = async (event: MessageEvent) => {
  const { id, action, password, names, bytes } = event.data
  try {
    if (action === 'unlock') {
      if (cipher || typeof password !== 'string' || !password || password.length > 1024 || !Array.isArray(names) || names.length > 2000) throw new Error()
      const next = new Cipher('base64')
      await next.key(password, '')
      const paths: string[] = []
      for (const name of names) {
        const path = await next.decryptFileName(name)
        if (!path || path.startsWith('/') || /[\\\u0000-\u001f\u007f]/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error()
        paths.push(path)
      }
      cipher = next
      self.postMessage({ id, ok: true, value: paths })
    } else if (action === 'read') {
      if (!cipher || !(bytes instanceof Uint8Array) || bytes.length > 8 * 1024 ** 2) throw new Error()
      const plain = await cipher.decryptData(bytes)
      if (plain.length > 2 * 1024 ** 2) throw new Error()
      // Validate the Markdown encoding before exposing it to the reader.
      new TextDecoder('utf-8', { fatal: true }).decode(plain)
      self.postMessage({ id, ok: true, value: plain }, { transfer: [plain.buffer] })
    } else throw new Error()
  } catch {
    self.postMessage({ id, ok: false })
  }
}
