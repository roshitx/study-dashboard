import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleAuth } from '@/integrations/auth.server'

export const Route = createFileRoute('/api/auth/google/login')({
  server: { handlers: { GET: ({ request }) => handleAuth(request, env) } },
})
