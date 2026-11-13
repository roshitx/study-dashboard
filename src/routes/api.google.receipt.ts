import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleTutonWrite } from '@/integrations/tuton-write.server'
export const Route = createFileRoute('/api/google/receipt')({ server: { handlers: { GET: ({ request }) => handleTutonWrite(request, env) } } })
