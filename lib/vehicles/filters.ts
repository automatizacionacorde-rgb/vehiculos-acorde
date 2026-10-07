import { sql } from 'drizzle-orm'

// Categorías (cCategoria) de uso particular: autos de pasajeros, SUVs y pickups (210, confirmado).
// Excluidas a propósito: 225 (vans de carga), el resto de 200s y 400s (carga, autobuses, equipo pesado, motos).
export const CATEGORIAS_PARTICULAR = [100, 103, 104, 105, 111, 132, 210] as const

export const soloParticulares = sql`"cCategoria" IN (${sql.join(CATEGORIAS_PARTICULAR.map((c) => sql`${c}`), sql`, `)})`
