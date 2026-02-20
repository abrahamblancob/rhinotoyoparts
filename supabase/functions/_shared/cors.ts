const allowedOrigins = [
  'https://www.rhinotoyoparts.com',
  'https://rhinotoyoparts.com',
  'http://localhost:5173',
]

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// Static fallback for places that don't have access to the request object
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.rhinotoyoparts.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
