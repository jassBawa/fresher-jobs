export * from './schema.js';
export * from './client.js';
export * from './normalize.js';
export * from './verify-apply.js';

/**
 * The query helpers callers need, re-exported.
 *
 * Consumers depend on @jobs/db, not on drizzle — this package owns the database
 * concern, so the operators come out of it too. Without this the ingest app
 * would have to declare drizzle-orm itself and could drift to a different
 * version than the schema was built against.
 */
export {
	eq,
	ne,
	and,
	or,
	not,
	isNull,
	isNotNull,
	inArray,
	notInArray,
	lt,
	lte,
	gt,
	gte,
	desc,
	asc,
	count,
	sql,
} from 'drizzle-orm';
