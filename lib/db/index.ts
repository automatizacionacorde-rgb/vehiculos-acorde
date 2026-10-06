import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const globalForDb = globalThis as unknown as { vehiclePool?: Pool }

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined. Configure the Neon DATABASE_URL environment variable for this runtime.')
}

export const pool = globalForDb.vehiclePool ?? new Pool({ connectionString })

if (process.env.NODE_ENV !== 'production') globalForDb.vehiclePool = pool

export const db = drizzle(pool)
