import type { Order, OrderItem, OrderStatus, PaymentMethod } from '@fastfood/shared';
import { execute, queryAll, queryOne, type Database } from '../../db/database.ts';

interface OrderRow {
  id: string;
  shift_id: string;
  number: number;
  status: OrderStatus;
  customer: string;
  note: string;
  payment_method: PaymentMethod;
  total_cents: number;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItemRow {
  order_id: string;
  product_id: string | null;
  name: string;
  unit_price_cents: number;
  quantity: number;
}

const toItem = (row: OrderItemRow): OrderItem => ({
  productId: row.product_id,
  name: row.name,
  unitPriceCents: row.unit_price_cents,
  quantity: row.quantity,
});

const toOrder = (row: OrderRow, items: OrderItem[]): Order => ({
  id: row.id,
  shiftId: row.shift_id,
  number: row.number,
  status: row.status,
  customer: row.customer,
  note: row.note,
  paymentMethod: row.payment_method,
  totalCents: row.total_cents,
  items,
  cancelReason: row.cancel_reason,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type NewOrder = Omit<Order, 'cancelReason' | 'updatedAt'>;

export function createOrdersRepository(db: Database) {
  return {
    listByShift(shiftId: string): Order[] {
      const rows = queryAll<OrderRow>(db, 'SELECT * FROM orders WHERE shift_id = ? ORDER BY number', [
        shiftId,
      ]);
      const items = queryAll<OrderItemRow>(
        db,
        `SELECT i.* FROM order_items i JOIN orders o ON o.id = i.order_id
         WHERE o.shift_id = ? ORDER BY i.id`,
        [shiftId],
      );
      const byOrder = Map.groupBy(items, (i) => i.order_id);
      return rows.map((r) => toOrder(r, (byOrder.get(r.id) ?? []).map(toItem)));
    },

    findById(id: string): Order | undefined {
      const row = queryOne<OrderRow>(db, 'SELECT * FROM orders WHERE id = ?', [id]);
      if (!row) return undefined;
      const items = queryAll<OrderItemRow>(db, 'SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [
        id,
      ]);
      return toOrder(row, items.map(toItem));
    },

    nextNumber(shiftId: string): number {
      const row = queryOne<{ n: number }>(
        db,
        'SELECT COALESCE(MAX(number), 0) + 1 AS n FROM orders WHERE shift_id = ?',
        [shiftId],
      );
      return row?.n ?? 1;
    },

    /** Insere o pedido e seus itens. Deve ser chamado dentro de uma transação. */
    insert(order: NewOrder): void {
      execute(
        db,
        `INSERT INTO orders (id, shift_id, number, status, customer, note, payment_method, total_cents,
                             created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.shiftId,
          order.number,
          order.status,
          order.customer,
          order.note,
          order.paymentMethod,
          order.totalCents,
          order.createdBy,
          order.createdAt,
          order.createdAt,
        ],
      );
      for (const item of order.items) {
        execute(
          db,
          `INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity)
           VALUES (?, ?, ?, ?, ?)`,
          [order.id, item.productId, item.name, item.unitPriceCents, item.quantity],
        );
      }
    },

    /** Atualiza o status somente se ele ainda for `from` (evita corrida entre telas). */
    updateStatus(id: string, from: OrderStatus, to: OrderStatus, cancelReason: string | null): boolean {
      return (
        execute(
          db,
          `UPDATE orders SET status = ?, cancel_reason = COALESCE(?, cancel_reason), updated_at = ?
           WHERE id = ? AND status = ?`,
          [to, cancelReason, new Date().toISOString(), id, from],
        ) > 0
      );
    },
  };
}

export type OrdersRepository = ReturnType<typeof createOrdersRepository>;
