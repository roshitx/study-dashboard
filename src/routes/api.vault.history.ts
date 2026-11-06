import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleVault } from '@/integrations/vault.server'

export const Route = createFileRoute('/api/vault/history')({
  server: { handlers: { GET: ({ request }) => handleVault(request, env), POST: ({ request }) => handleVault(request, env) } },
})
