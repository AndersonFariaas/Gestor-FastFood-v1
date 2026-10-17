import type { Product } from '@fastfood/shared';
import { execute, queryAll, queryOne, type Database } from '../../db/database.ts';

interface ProductRow {
  id: string;
  name: string;
  price_cents: number;
  category: string;
  description: string;
  active: number;
}

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  priceCents: row.price_cents,
  category: row.category,
  description: row.description,
  active: row.active === 1,
});

export interface ProductData {
  name: string;
  priceCents: number;
  category: string;
  description: string;
  active: boolean;
}

// Produtos removidos ficam no banco com `deleted_at` preenchido (exclusão lógica).
const COLUMNS = 'id, name, price_cents, category, description, active';

export function createProductsRepository(db: Database) {
  return {
    list(): Product[] {
      return queryAll<ProductRow>(
        db,
        `SELECT ${COLUMNS} FROM products WHERE deleted_at IS NULL ORDER BY category, name`,
      ).map(toProduct);
    },

    findById(id: string): Product | undefined {
      const row = queryOne<ProductRow>(
        db,
        `SELECT ${COLUMNS} FROM products WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row && toProduct(row);
    },

    /** Produtos ativos (vendáveis) entre os ids informados. */
    findSellable(ids: string[]): Product[] {
      if (!ids.length) return [];
      return queryAll<ProductRow>(
        db,
        `SELECT ${COLUMNS} FROM products
         WHERE active = 1 AND deleted_at IS NULL AND id IN (${ids.map(() => '?').join(', ')})`,
        ids,
      ).map(toProduct);
    },

    insert(id: string, p: ProductData): void {
      const now = new Date().toISOString();
      execute(
        db,
        `INSERT INTO products (id, name, price_cents, category, description, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, p.name, p.priceCents, p.category, p.description, p.active ? 1 : 0, now, now],
      );
    },

    update(id: string, p: ProductData): boolean {
      return (
        execute(
          db,
          `UPDATE products SET name = ?, price_cents = ?, category = ?, description = ?, active = ?, updated_at = ?
           WHERE id = ? AND deleted_at IS NULL`,
          [p.name, p.priceCents, p.category, p.description, p.active ? 1 : 0, new Date().toISOString(), id],
        ) > 0
      );
    },

    softDelete(id: string): boolean {
      const now = new Date().toISOString();
      return (
        execute(
          db,
          'UPDATE products SET deleted_at = ?, active = 0, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
          [now, now, id],
        ) > 0
      );
    },
  };
}

export type ProductsRepository = ReturnType<typeof createProductsRepository>;
