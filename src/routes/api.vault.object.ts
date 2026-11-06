import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleVault } from '@/integrations/vault.server'

export const Route = createFileRoute('/api/vault/object')({
  server: { handlers: { GET: ({ request }) => handleVault(request, env), PUT: ({ request }) => handleVault(request, env) } },
})
