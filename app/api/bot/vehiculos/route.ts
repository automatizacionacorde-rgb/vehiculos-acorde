import { checkBotKey } from '@/lib/bot-auth'
import { db } from '@/lib/db'
import { soloParticulares } from '@/lib/vehicles/filters'
import { sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const LIMIT = 15

// Búsqueda libre para el bot: "aveo 2020 automatico" → versiones que contienen todas las palabras.
// Un número de 4 dígitos se toma como año (campo "Modelo" del formulario).
export async function GET(request: NextRequest) {
  const denied = checkBotKey(request)
  if (denied) return denied

  const q = request.nextUrl.searchParams.get('q')?.trim().slice(0, 100) ?? ''
  const words = q.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/\s+/).filter(Boolean).slice(0, 8)
  const anio = words.find((word) => /^(19|20)\d{2}$/.test(word))
  const terms = words.filter((word) => word !== anio)
  if (!terms.length) return Response.json({ error: 'Escribe al menos la marca o la submarca.' }, { status: 400 })

  const texto = sql`BTRIM("cMarcaLarga") || ' ' || BTRIM("cTipo") || ' ' || BTRIM("cVersion")`
  const conditions = terms.map((term) => sql`${texto} ILIKE ${`%${term.replace(/[\\%_]/g, '\\$&')}%`}`)
  if (anio) conditions.push(sql`"cModelo" = ${anio}::integer`)

  const result = await db.execute<{ id: string; marca: string; submarca: string; anio: number; version: string }>(sql`
    SELECT MIN(id)::text AS id, BTRIM("cMarcaLarga") AS marca, BTRIM("cTipo") AS submarca, "cModelo" AS anio, BTRIM("cVersion") AS version
    FROM vehiculos
    WHERE ${soloParticulares}
      AND "cVersion" IS NOT NULL
      AND BTRIM("cVersion") <> ''
      AND ${sql.join(conditions, sql` AND `)}
    GROUP BY BTRIM("cMarcaLarga"), BTRIM("cTipo"), "cModelo", BTRIM("cVersion")
    ORDER BY marca, submarca, anio DESC, version
    LIMIT ${LIMIT + 1}
  `)

  // `hayMas` avisa al bot que hay más resultados y conviene pedir más detalle (año, versión, transmisión).
  const rows = result.rows.slice(0, LIMIT)
  return Response.json({
    hayMas: result.rows.length > LIMIT,
    resultados: rows.map((row) => ({ ...row, anio: Number(row.anio), label: `${row.marca} ${row.submarca} ${row.anio} ${row.version}` })),
  })
}
