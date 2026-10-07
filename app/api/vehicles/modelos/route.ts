import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { soloParticulares } from '@/lib/vehicles/filters'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const marca = request.nextUrl.searchParams.get('marca')?.trim()
  if (!marca) return Response.json({ error: 'El parámetro marca es requerido.' }, { status: 400 })

  const result = await db.execute<{ value: string }>(sql`
    SELECT DISTINCT BTRIM("cTipo") AS value, BTRIM("cTipo") AS label
    FROM vehiculos
    WHERE ${soloParticulares}
      AND "cMarcaLarga" = ${marca}
      AND "cTipo" IS NOT NULL
      AND BTRIM("cTipo") <> ''
    ORDER BY value ASC
  `)

  return Response.json(result.rows)
}
