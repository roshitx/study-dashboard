import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleAuth } from '@/integrations/auth.server'

export const Route = createFileRoute('/api/session')({
  server: { handlers: { GET: ({ request }) => handleAuth(request, env) } },
})
