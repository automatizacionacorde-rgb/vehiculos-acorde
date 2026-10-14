import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { soloParticulares } from '@/lib/vehicles/filters'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Submarcas (tipo, p. ej. AVEO) de una marca y año. La descripción sale de /api/vehicles/versiones.
export async function GET(request: NextRequest) {
  const marca = request.nextUrl.searchParams.get('marca')?.trim()
  const anio = request.nextUrl.searchParams.get('anio')?.trim()
  if (!marca || !anio || !/^\d{4}$/.test(anio)) return Response.json({ error: 'Los parámetros marca y anio son requeridos.' }, { status: 400 })

  const result = await db.execute<{ value: string }>(sql`
    SELECT DISTINCT BTRIM("cTipo") AS value
    FROM vehiculos
    WHERE ${soloParticulares}
      AND "cMarcaLarga" = ${marca}
      AND "cModelo" = ${anio}::integer
      AND "cTipo" IS NOT NULL
      AND BTRIM("cTipo") <> ''
    ORDER BY value ASC
  `)

  return Response.json(result.rows.map((row) => ({ value: row.value, label: row.value })))
}
