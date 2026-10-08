import { db } from '@/lib/db'
import { soloParticulares } from '@/lib/vehicles/filters'
import { sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const JOTFORM_API = 'https://api.jotform.com'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { versionId?: unknown } | null
  const versionId = typeof body?.versionId === 'string' ? body.versionId.trim() : ''
  if (!/^\d{1,18}$/.test(versionId)) return Response.json({ error: 'Selecciona un vehículo válido.' }, { status: 400 })

  const { JOTFORM_API_KEY, JOTFORM_FORM_ID, JOTFORM_FIELD_BRAND_ID, JOTFORM_FIELD_MODEL_ID, JOTFORM_FIELD_YEAR_ID, JOTFORM_FIELD_VERSION_ID, JOTFORM_FIELD_USE_ID } = process.env
  if (!JOTFORM_API_KEY || !JOTFORM_FORM_ID || !JOTFORM_FIELD_BRAND_ID || !JOTFORM_FIELD_MODEL_ID || !JOTFORM_FIELD_YEAR_ID || !JOTFORM_FIELD_VERSION_ID || !JOTFORM_FIELD_USE_ID) {
    console.error('Jotform: faltan variables de entorno')
    return Response.json({ error: 'El envío no está configurado.' }, { status: 500 })
  }

  // Los datos se leen de la base, no del cliente, y solo se aceptan vehículos de uso particular.
  const result = await db.execute<{ marca: string; modelo: string; anio: number; version: string }>(sql`
    SELECT BTRIM("cMarcaLarga") AS marca, BTRIM("cTipo") AS modelo, "cModelo" AS anio, BTRIM("cVersion") AS version
    FROM vehiculos
    WHERE ${soloParticulares}
      AND id = ${versionId}::bigint
    LIMIT 1
  `)
  const vehicle = result.rows[0]
  if (!vehicle) return Response.json({ error: 'El vehículo seleccionado no está disponible.' }, { status: 404 })

  const form = new URLSearchParams({
    [`submission[${JOTFORM_FIELD_BRAND_ID}]`]: vehicle.marca,
    [`submission[${JOTFORM_FIELD_MODEL_ID}]`]: vehicle.modelo,
    [`submission[${JOTFORM_FIELD_YEAR_ID}]`]: String(vehicle.anio),
    [`submission[${JOTFORM_FIELD_VERSION_ID}]`]: vehicle.version,
    [`submission[${JOTFORM_FIELD_USE_ID}]`]: 'Particular',
  })

  try {
    const response = await fetch(`${JOTFORM_API}/form/${JOTFORM_FORM_ID}/submissions`, {
      method: 'POST',
      headers: { APIKEY: JOTFORM_API_KEY },
      body: form,
    })
    if (!response.ok) {
      console.error('Jotform: respuesta no exitosa', response.status, await response.text())
      return Response.json({ error: 'No se pudo enviar la solicitud. Intenta de nuevo.' }, { status: 502 })
    }
  } catch (error) {
    console.error('Jotform: error de red', error)
    return Response.json({ error: 'No se pudo enviar la solicitud. Intenta de nuevo.' }, { status: 502 })
  }

  return Response.json({ ok: true })
}
