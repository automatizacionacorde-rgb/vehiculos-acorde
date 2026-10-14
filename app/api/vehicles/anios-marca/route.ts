import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { soloParticulares } from '@/lib/vehicles/filters'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Años (campo "Modelo" del formulario de cotización) disponibles para una marca.
export async function GET(request: NextRequest) {
  const marca = request.nextUrl.searchParams.get('marca')?.trim()
  if (!marca) return Response.json({ error: 'El parámetro marca es requerido.' }, { status: 400 })

  const result = await db.execute<{ value: number }>(sql`
    SELECT DISTINCT "cModelo" AS value
    FROM vehiculos
    WHERE ${soloParticulares}
      AND "cMarcaLarga" = ${marca}
      AND "cModelo" IS NOT NULL
    ORDER BY value DESC
  `)

  return Response.json(result.rows.map((row) => ({ value: String(row.value), label: String(row.value) })))
}
