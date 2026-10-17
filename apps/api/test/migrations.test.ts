import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { execute, openDatabase, queryAll } from '../src/db/database.ts';
import { migrate } from '../src/db/migrate.ts';

const MIGRATIONS = join(import.meta.dirname, '../src/db/migrations');

describe('migrações', () => {
  it('002 unifica pedidos de crédito e débito como "Cartão"', () => {
    // Banco no estado da migração 001, com pedidos nas formas de pagamento antigas.
    const db = openDatabase(':memory:');
    db.exec(readFileSync(join(MIGRATIONS, '001_initial.sql'), 'utf8'));
    db.exec(`CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
    execute(db, `INSERT INTO schema_migrations VALUES ('001_initial.sql', '2026-01-01')`);
    execute(db, `INSERT INTO shifts (id, opened_at) VALUES ('s1', '2026-01-01')`);
    ['CREDITO', 'DEBITO', 'PIX', 'VALE'].forEach((method, i) =>
      execute(
        db,
        `INSERT INTO orders (id, shift_id, number, status, customer, payment_method, total_cents, created_at, updated_at)
         VALUES (?, 's1', ?, 'ENTREGUE', 'Cliente', ?, 100, '2026-01-01', '2026-01-01')`,
        [`o${i}`, i + 1, method],
      ),
    );

    expect(migrate(db)).toContain('002_cartao_unificado.sql');
    const methods = queryAll<{ payment_method: string }>(
      db,
      'SELECT payment_method FROM orders ORDER BY number',
    );
    expect(methods.map((m) => m.payment_method)).toEqual(['CARTAO', 'CARTAO', 'PIX', 'VALE']);
    db.close();
  });
});
