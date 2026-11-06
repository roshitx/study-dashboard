import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleVault } from '@/integrations/vault.server'

export const Route = createFileRoute('/api/vault/list')({
  server: { handlers: { GET: ({ request }) => handleVault(request, env) } },
})
