import { test, expect } from 'bun:test'
import { googleAccessToken, protectGoogleToken, type GoogleEnv } from '../src/integrations/google.server'
test('refresh distinguishes revoked grant, invalid client, network and damaged token without leaking provider details', async () => {
 const env: GoogleEnv = { GOOGLE_TOKEN_KEY: 'ab'.repeat(32), GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic' }
 let encrypted = await protectGoogleToken(env, 'owner', 'sheets', 'synthetic-refresh')
 env.AUTH_DB = { prepare() { return { bind() { return this }, async first<T>() { return { encrypted_token: encrypted } as T }, async run() { } } } }
 const original = globalThis.fetch
 try {
  for (const [provider, expected] of [['invalid_grant', 'reconnect_required'], ['invalid_client', 'oauth_client_error'], ['temporarily_unavailable', 'provider_error']] as const) {
   globalThis.fetch = Object.assign(async () => Response.json({ error: provider, error_description: 'private-provider-detail' }, { status: 400 }), { preconnect: original.preconnect })
   await expect(googleAccessToken(env, 'owner', 'sheets')).rejects.toThrow(expected)
  }
  globalThis.fetch = Object.assign(async () => { throw new TypeError('private-network-detail') }, { preconnect: original.preconnect })
  await expect(googleAccessToken(env, 'owner', 'sheets')).rejects.toThrow('refresh_unavailable')
  encrypted = 'damaged'
  await expect(googleAccessToken(env, 'owner', 'sheets')).rejects.toThrow('token_unreadable')
 } finally { globalThis.fetch = original }
})
