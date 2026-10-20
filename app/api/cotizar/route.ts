import { enviarCotizacion } from '@/lib/cotizar'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return Response.json({ error: 'Solicitud inválida.' }, { status: 400 })

  const result = await enviarCotizacion(body)
  return Response.json(result.body, { status: result.status })
}
