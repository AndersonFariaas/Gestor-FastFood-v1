import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execute, queryAll, transaction, type Database } from './database.ts';

const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations');

/** Aplica, em ordem, os arquivos `NNN_nome.sql` ainda não registrados em `schema_migrations`. */
export function migrate(db: Database): string[] {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`,
  );

  const applied = new Set(
    queryAll<{ version: string }>(db, 'SELECT version FROM schema_migrations').map((r) => r.version),
  );
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !applied.has(f))
    .sort();

  for (const file of pending) {
    transaction(db, () => {
      db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
      execute(db, 'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        file,
        new Date().toISOString(),
      ]);
    });
  }
  return pending;
}
