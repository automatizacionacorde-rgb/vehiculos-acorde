import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const marca = request.nextUrl.searchParams.get('marca')?.trim()
  const modelo = request.nextUrl.searchParams.get('modelo')?.trim()
  const anio = request.nextUrl.searchParams.get('anio')?.trim()
  if (!marca || !modelo || !anio) return Response.json({ error: 'Los parámetros marca, modelo y anio son requeridos.' }, { status: 400 })

  const result = await db.execute<{ id: string; value: string }>(sql`
    SELECT MIN(id)::text AS id, BTRIM("cVersion") AS value
    FROM vehiculos
    WHERE "cMarcaLarga" = ${marca}
      AND "cTipo" = ${modelo}
      AND "cModelo" = ${anio}::integer
      AND "cVersion" IS NOT NULL
      AND BTRIM("cVersion") <> ''
    GROUP BY BTRIM("cVersion")
    ORDER BY value ASC
  `)

  return Response.json(result.rows.map((row) => ({ ...row, label: row.value })))
}
