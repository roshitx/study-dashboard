import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleTutonWrite } from '@/integrations/tuton-write.server'
export const Route = createFileRoute('/api/google/reconcile')({ server: { handlers: { POST: ({ request }) => handleTutonWrite(request, env) } } })
