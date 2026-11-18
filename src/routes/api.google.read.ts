import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleGoogle } from '@/integrations/google.server'

export const Route = createFileRoute('/api/google/read')({ server: { handlers: { GET: ({ request }) => handleGoogle(request, env) } } })
