/**
 * Importa os dados do sistema antigo (arquivo `lanchonete.sqlite` da v1) para o banco novo.
 *
 * Uso: npm run db:import-legacy -- <caminho/para/lanchonete.sqlite>
 *
 * - Usuários mantêm a senha (hash bcrypt). Quem ainda usa a senha padrão "admin123" precisará trocá-la.
 * - Preços são convertidos para centavos; pedidos arquivados viram um turno fechado.
 * - Só roda em um banco novo sem pedidos nem produtos, para não duplicar dados.
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PAYMENT_METHOD_LABELS, toCents, type OrderStatus, type PaymentMethod } from '@fastfood/shared';
import { loadConfig } from '../config.ts';
import { execute, openDatabase, queryAll, queryOne, transaction } from '../db/database.ts';
import { migrate } from '../db/migrate.ts';
import { verifyPassword } from '../lib/security.ts';

interface LegacyUser {
  id: string;
  username: string;
  password: string;
  role: string;
}
interface LegacyProduct {
  id: string;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  active: number;
}
interface LegacyOrder {
  id: string;
  number: number;
  createdAt: string;
  status: string;
  customer: string | null;
  note: string | null;
  items: string;
  paymentMethod: string | null;
}
interface LegacyItem {
  id?: string;
  name: string;
  price: number;
  qty: number;
}

const legacyPath = process.argv[2] && resolve(process.cwd(), process.argv[2]);
if (!legacyPath || !existsSync(legacyPath)) {
  console.error('Informe o caminho do banco antigo: npm run db:import-legacy -- ../../lanchonete.sqlite');
  process.exit(1);
}

const legacy = new DatabaseSync(legacyPath, { readOnly: true });
const config = loadConfig();
const db = openDatabase(config.dbPath);
migrate(db);

const count = (table: string) => queryOne<{ n: number }>(db, `SELECT COUNT(*) AS n FROM ${table}`)?.n ?? 0;
if (count('orders') > 0 || count('products') > 0) {
  console.error('O banco de destino já possui dados. A importação só pode ser feita em um banco novo.');
  process.exit(1);
}

const paymentByLabel = new Map(
  Object.entries(PAYMENT_METHOD_LABELS).map(([code, label]) => [label, code as PaymentMethod]),
);
const STATUSES: OrderStatus[] = ['NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'];

const users = legacy.prepare('SELECT * FROM users').all() as unknown as LegacyUser[];
const products = legacy.prepare('SELECT * FROM products').all() as unknown as LegacyProduct[];
const orders = legacy.prepare('SELECT * FROM orders').all() as unknown as LegacyOrder[];

const usesDefaultPassword = new Map<string, boolean>();
for (const u of users) usesDefaultPassword.set(u.id, await verifyPassword('admin123', u.password));

const now = new Date().toISOString();
const productIds = new Set(products.map((p) => p.id));

transaction(db, () => {
  for (const u of users) {
    // Remove o admin criado automaticamente, se houver, para manter o do sistema antigo.
    execute(db, 'DELETE FROM users WHERE username = ?', [u.username]);
    execute(
      db,
      `INSERT INTO users (id, username, password_hash, role, must_change_password, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        u.id,
        u.username,
        u.password,
        u.role === 'admin' ? 'admin' : 'operator',
        usesDefaultPassword.get(u.id) ? 1 : 0,
        now,
      ],
    );
  }

  for (const p of products) {
    execute(
      db,
      `INSERT INTO products (id, name, price_cents, category, description, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.name,
        toCents(p.price),
        p.category || 'Geral',
        p.description ?? '',
        p.active ? 1 : 0,
        now,
        now,
      ],
    );
  }

  // Pedidos arquivados (turnos já encerrados) entram num turno fechado; os demais, no turno aberto.
  const archived = orders.filter((o) => o.status === 'ARQUIVADO');
  const current = orders.filter((o) => o.status !== 'ARQUIVADO');

  const openShift =
    queryAll<{ id: string }>(db, 'SELECT id FROM shifts WHERE closed_at IS NULL')[0]?.id ?? randomUUID();
  if (!queryOne(db, 'SELECT 1 FROM shifts WHERE id = ?', [openShift])) {
    execute(db, 'INSERT INTO shifts (id, opened_at) VALUES (?, ?)', [openShift, now]);
  }

  const insertOrders = (list: LegacyOrder[], shiftId: string, statusFor: (o: LegacyOrder) => OrderStatus) => {
    list.forEach((o, index) => {
      const items = JSON.parse(o.items) as LegacyItem[];
      const total = items.reduce((s, i) => s + toCents(i.price) * i.qty, 0);
      execute(
        db,
        `INSERT INTO orders (id, shift_id, number, status, customer, note, payment_method, total_cents,
                             created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          o.id,
          shiftId,
          index + 1,
          statusFor(o),
          o.customer || 'Balcão',
          o.note ?? '',
          paymentByLabel.get(o.paymentMethod ?? '') ?? 'NAO_INFORMADO',
          total,
          o.createdAt,
          o.createdAt,
        ],
      );
      for (const i of items) {
        execute(
          db,
          'INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?)',
          [o.id, i.id && productIds.has(i.id) ? i.id : null, i.name, toCents(i.price), i.qty],
        );
      }
    });
  };

  if (archived.length) {
    const closedShift = randomUUID();
    const dates = archived.map((o) => o.createdAt).sort();
    execute(db, 'INSERT INTO shifts (id, opened_at, closed_at) VALUES (?, ?, ?)', [
      closedShift,
      dates[0]!,
      dates.at(-1)!,
    ]);
    // O status real dos pedidos arquivados se perdeu na v1: considera-se entregue.
    insertOrders(archived, closedShift, () => 'ENTREGUE');
  }
  insertOrders(current, openShift, (o) =>
    STATUSES.includes(o.status as OrderStatus) ? (o.status as OrderStatus) : 'NOVO',
  );
});

legacy.close();
db.close();

console.log(
  `✅ Importação concluída: ${users.length} usuário(s), ${products.length} produto(s), ${orders.length} pedido(s).`,
);
const pending = users.filter((u) => usesDefaultPassword.get(u.id)).map((u) => u.username);
if (pending.length)
  console.log(`🔑 Usuários com a senha padrão deverão trocá-la no próximo login: ${pending.join(', ')}`);
