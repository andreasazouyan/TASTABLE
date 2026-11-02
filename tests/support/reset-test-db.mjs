// Empties a throwaway test database (the Postgres equivalent of deleting the old SQLite test file).
// Refuses to touch any database whose name does not end in _test or _e2e.
import pg from "pg";

const url = process.env.DATABASE_URL;
const name = url ? new URL(url).pathname.slice(1) : "";
if (!/_(test|e2e)$/.test(name)) {
  console.error(`Refusing to reset "${name || "(no DATABASE_URL)"}": only *_test or *_e2e databases can be reset.`);
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
await client.end();
