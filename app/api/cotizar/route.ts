import { db } from '@/lib/db'
import { soloParticulares } from '@/lib/vehicles/filters'
import { sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const DEFAULT_THANK_YOU_URL = 'https://100seguros.com/Principal/confirmacion-autos/'

// Nombres de campo del formulario de Jotform (qID_nombre). Se envían al mismo endpoint que usa el
// formulario original, así que Jotform los trata como un envío normal (correos, webhook a n8n, etc.).
const FIELD = {
  nombre: 'q49_nombreY',
  email: 'q54_email',
  telefono: 'q43_numeroDe',
  sexo: 'q13_escribaUna',
  fecha: 'q63_fecha',
  subramo: 'q19_escribaUna19',
  codigoPostal: 'q33_escribaUna33',
  anio: 'q51_modelo51',
  marcaDescripcion: 'q36_marca',
  cobertura: 'q38_cobertura',
  utm_source: 'q55_utm_source',
  utm_medium: 'q56_utm_medium',
  utm_campaign: 'q57_utm_campaign',
  utm_content: 'q58_utm_content',
  utm_term: 'q59_utm_term',
  landing_url: 'q61_landing_url',
  producto: 'q62_producto',
} as const

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'landing_url', 'producto'] as const

function text(value: unknown, max = 80) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function validDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  const ok = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  if (!ok || year < 1900 || date.getTime() > Date.now()) return null
  return { day: match[1], month: match[2], year: match[3] }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return Response.json({ error: 'Solicitud inválida.' }, { status: 400 })

  // Tolera espacios, saltos de línea y comillas que suelen colarse al pegar la variable en Vercel.
  const JOTFORM_QUOTE_FORM_ID = process.env.JOTFORM_QUOTE_FORM_ID?.trim().replace(/^["']+|["']+$/g, '').trim()
  const JOTFORM_QUOTE_THANKYOU_URL = process.env.JOTFORM_QUOTE_THANKYOU_URL?.trim()
  if (!JOTFORM_QUOTE_FORM_ID) {
    console.error('Cotizar: la variable JOTFORM_QUOTE_FORM_ID no existe en este despliegue o está vacía')
    return Response.json({ error: 'El envío no está configurado.' }, { status: 500 })
  }
  if (!/^\d{6,20}$/.test(JOTFORM_QUOTE_FORM_ID)) {
    console.error(`Cotizar: JOTFORM_QUOTE_FORM_ID debe ser solo el número del formulario (longitud recibida: ${JOTFORM_QUOTE_FORM_ID.length})`)
    return Response.json({ error: 'El envío no está configurado.' }, { status: 500 })
  }

  const nombre = text(body.nombre, 60)
  const paterno = text(body.paterno, 60)
  const materno = text(body.materno, 60)
  const email = text(body.email, 120)
  const telefono = text(body.telefono, 20).replace(/\D/g, '')
  const sexo = text(body.sexo, 10)
  const fecha = validDate(text(body.fechaNacimiento, 10))
  const codigoPostal = text(body.codigoPostal, 5)
  const versionId = text(body.versionId, 18)

  if (!nombre || !paterno) return Response.json({ error: 'Escribe tu nombre y apellido paterno.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: 'Escribe un correo válido.' }, { status: 400 })
  if (telefono.length !== 10) return Response.json({ error: 'El teléfono debe tener 10 dígitos.' }, { status: 400 })
  if (sexo !== 'Mujer' && sexo !== 'Hombre') return Response.json({ error: 'Selecciona el sexo.' }, { status: 400 })
  if (!fecha) return Response.json({ error: 'La fecha de nacimiento debe tener el formato DD/MM/AAAA.' }, { status: 400 })
  if (!/^\d{5}$/.test(codigoPostal)) return Response.json({ error: 'El código postal debe tener 5 dígitos.' }, { status: 400 })
  if (!/^\d{1,18}$/.test(versionId)) return Response.json({ error: 'Selecciona un vehículo válido.' }, { status: 400 })

  // El vehículo se lee de la base, no del cliente, y solo se aceptan vehículos de uso particular.
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
    formID: JOTFORM_QUOTE_FORM_ID,
    simple_spc: `${JOTFORM_QUOTE_FORM_ID}-${JOTFORM_QUOTE_FORM_ID}`,
    [`${FIELD.nombre}[first]`]: nombre,
    [`${FIELD.nombre}[middle]`]: paterno,
    [`${FIELD.nombre}[last]`]: materno,
    [FIELD.email]: email,
    [`${FIELD.telefono}[full]`]: `(${telefono.slice(0, 3)}) ${telefono.slice(3, 6)}-${telefono.slice(6)}`,
    [FIELD.sexo]: sexo,
    [`${FIELD.fecha}[day]`]: fecha.day,
    [`${FIELD.fecha}[month]`]: fecha.month,
    [`${FIELD.fecha}[year]`]: fecha.year,
    [FIELD.subramo]: 'Particular',
    [FIELD.codigoPostal]: codigoPostal,
    [FIELD.anio]: String(vehicle.anio),
    [FIELD.marcaDescripcion]: `${vehicle.marca} ${vehicle.modelo} ${vehicle.version}`,
    [FIELD.cobertura]: 'Amplia',
  })
  for (const key of UTM_KEYS) form.set(FIELD[key], text(body[key], 300))

  try {
    const response = await fetch(`https://submit.jotform.com/submit/${JOTFORM_QUOTE_FORM_ID}`, {
      method: 'POST',
      body: form,
      redirect: 'manual',
    })
    if (response.status >= 400) {
      console.error('Cotizar: Jotform respondió', response.status)
      return Response.json({ error: 'No se pudo enviar la solicitud. Intenta de nuevo.' }, { status: 502 })
    }
  } catch (error) {
    console.error('Cotizar: error de red', error)
    return Response.json({ error: 'No se pudo enviar la solicitud. Intenta de nuevo.' }, { status: 502 })
  }

  return Response.json({ ok: true, thankYouUrl: JOTFORM_QUOTE_THANKYOU_URL || DEFAULT_THANK_YOU_URL })
}
