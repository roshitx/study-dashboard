import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleAuth } from '@/integrations/auth.server'

export const Route = createFileRoute('/api/auth/google/callback')({
  server: { handlers: { GET: ({ request }) => handleAuth(request, env) } },
})
