import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

// Initialize PostgreSQL client connection pool
export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  prepare: false, // Recommended for broad compatibility (Supabase / Neon / PgBouncer / Local)
  onnotice: () => {}, // Suppress DDL notice logs
});

// Initialize Drizzle ORM instance with PostgreSQL schema
export const db = drizzle(client, { schema });

let isConnected = false;

/**
 * Liveness check untuk memastikan koneksi pool PostgreSQL aktif tanpa table lock DDL
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  if (isConnected) return true;
  try {
    await client`SELECT 1`;
    isConnected = true;
    return true;
  } catch (err) {
    console.warn(
      "⚠️ PostgreSQL connection check error:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}

/**
 * Kompatibilitas fungsi: DDL kini dikelola mandiri via `npm run db:migrate` (scripts/migrate.ts)
 * agar tidak menimbulkan deadlock atau race condition saat rolling deployment runtime.
 */
export async function initTablesPostgres(): Promise<void> {
  await checkDatabaseConnection();
}
