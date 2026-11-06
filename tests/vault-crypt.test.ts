import { test, expect } from 'bun:test'
import { Cipher } from '@fyears/rclone-crypt'
import fixture from './fixtures/rclone.json'

test('official rclone base64/empty-salt fixture decrypts with Remotely Save adapter', async () => {
  const cipher = new Cipher('base64')
  await cipher.key(fixture.password, fixture.salt)
  const object = fixture.objects[0]!
  expect(await cipher.decryptFileName(object.key)).toBe(fixture.path)
  expect(new TextDecoder().decode(await cipher.decryptData(new Uint8Array(Buffer.from(object.base64, 'base64'))))).toBe(fixture.plaintext)
})

test('wrong passwords and modified authenticated ciphertext do not expose plaintext', async () => {
  const bytes = new Uint8Array(Buffer.from(fixture.objects[0]!.base64, 'base64'))
  const wrong = new Cipher('base64')
  await wrong.key('wrong-fixture-password', '')
  await expect(wrong.decryptData(bytes)).rejects.toThrow()
  const cipher = new Cipher('base64')
  await cipher.key(fixture.password, '')
  const changed = bytes.slice()
  changed[changed.length - 1]! ^= 1
  await expect(cipher.decryptData(changed)).rejects.toThrow()
  await expect(cipher.decryptData(bytes.slice(0, 20))).rejects.toThrow()
})
