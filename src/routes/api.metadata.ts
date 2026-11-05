import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleMetadata } from '@/integrations/metadata.server'

export const Route = createFileRoute('/api/metadata')({
  server: {
    handlers: {
      GET: ({ request }) => handleMetadata(request, env),
      PUT: ({ request }) => handleMetadata(request, env),
    }
  },
})
