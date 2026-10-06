import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET() {
  const result = await db.execute<{ value: string }>(sql`
    SELECT DISTINCT BTRIM("cMarcaLarga") AS value, BTRIM("cMarcaLarga") AS label
    FROM vehiculos
    WHERE "cMarcaLarga" IS NOT NULL
      AND BTRIM("cMarcaLarga") <> ''
    ORDER BY value ASC
  `)

  return Response.json(result.rows)
}
