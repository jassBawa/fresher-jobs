/**
 * The database connection.
 *
 * Local development runs Postgres in Docker (see docker-compose.yml at the repo
 * root); production is Neon per decision D6. Both speak the same wire protocol,
 * so DATABASE_URL is the only thing that differs.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export const DEFAULT_URL = 'postgres://jobs:jobs@localhost:5432/jobs';

export function connectionString(): string {
	return process.env.DATABASE_URL || DEFAULT_URL;
}

/**
 * Open a connection. `max: 1` because every caller here is a short-lived
 * script — the ingest run, a migration, a one-off query — and a pool that
 * outlives the work keeps the process alive after main() returns.
 */
export function connect(url: string = connectionString()) {
	const sql = postgres(url, { max: 1, onnotice: () => {} });
	return { sql, db: drizzle(sql, { schema }) };
}

export type Database = ReturnType<typeof connect>['db'];
