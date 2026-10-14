import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { soloParticulares } from '@/lib/vehicles/filters'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Submarcas de una marca y año: cada opción es "TIPO VERSIÓN" y su id identifica el vehículo exacto.
export async function GET(request: NextRequest) {
  const marca = request.nextUrl.searchParams.get('marca')?.trim()
  const anio = request.nextUrl.searchParams.get('anio')?.trim()
  if (!marca || !anio || !/^\d{4}$/.test(anio)) return Response.json({ error: 'Los parámetros marca y anio son requeridos.' }, { status: 400 })

  const result = await db.execute<{ id: string; tipo: string; version: string }>(sql`
    SELECT MIN(id)::text AS id, BTRIM("cTipo") AS tipo, COALESCE(BTRIM("cVersion"), '') AS version
    FROM vehiculos
    WHERE ${soloParticulares}
      AND "cMarcaLarga" = ${marca}
      AND "cModelo" = ${anio}::integer
      AND "cTipo" IS NOT NULL
    GROUP BY BTRIM("cTipo"), COALESCE(BTRIM("cVersion"), '')
    ORDER BY tipo ASC, version ASC
  `)

  return Response.json(result.rows.map((row) => {
    const label = `${row.tipo} ${row.version}`.trim()
    return { id: row.id, value: label, label }
  }))
}
