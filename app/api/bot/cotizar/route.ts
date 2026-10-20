import { checkBotKey } from '@/lib/bot-auth'
import { enviarCotizacion } from '@/lib/cotizar'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Igual que /api/cotizar, pero para el bot de WhatsApp: exige la clave y marca el origen.
export async function POST(request: NextRequest) {
  const denied = checkBotKey(request)
  if (denied) return denied

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return Response.json({ error: 'Solicitud inválida.' }, { status: 400 })

  const result = await enviarCotizacion({ ...body, utm_source: 'whatsapp', utm_medium: 'bot', landing_url: '' })
  return Response.json(result.body, { status: result.status })
}
