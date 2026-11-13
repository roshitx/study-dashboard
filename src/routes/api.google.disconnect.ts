import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleGoogle } from '@/integrations/google.server'

export const Route = createFileRoute('/api/google/disconnect')({ server: { handlers: { POST: ({ request }) => handleGoogle(request, env) } } })
