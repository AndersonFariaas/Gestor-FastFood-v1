import type { OrderStatus, PaymentMethod, Shift } from '@fastfood/shared';
import { execute, queryAll, queryOne, type Database } from '../../db/database.ts';

interface ShiftRow {
  id: string;
  opened_at: string;
  closed_at: string | null;
}

const toShift = (row: ShiftRow): Shift => ({ id: row.id, openedAt: row.opened_at, closedAt: row.closed_at });

export interface ShiftTotalsRow {
  status: OrderStatus;
  payment_method: PaymentMethod;
  count: number;
  total_cents: number;
}

export function createShiftsRepository(db: Database) {
  return {
    findOpen(): Shift | undefined {
      const row = queryOne<ShiftRow>(
        db,
        'SELECT id, opened_at, closed_at FROM shifts WHERE closed_at IS NULL',
      );
      return row && toShift(row);
    },

    findById(id: string): Shift | undefined {
      const row = queryOne<ShiftRow>(db, 'SELECT id, opened_at, closed_at FROM shifts WHERE id = ?', [id]);
      return row && toShift(row);
    },

    listClosed(limit: number): Shift[] {
      return queryAll<ShiftRow>(
        db,
        'SELECT id, opened_at, closed_at FROM shifts WHERE closed_at IS NOT NULL ORDER BY closed_at DESC LIMIT ?',
        [limit],
      ).map(toShift);
    },

    insert(id: string, openedAt: string, openedBy: string | null): void {
      execute(db, 'INSERT INTO shifts (id, opened_at, opened_by) VALUES (?, ?, ?)', [id, openedAt, openedBy]);
    },

    close(id: string, closedAt: string, closedBy: string): void {
      execute(db, 'UPDATE shifts SET closed_at = ?, closed_by = ? WHERE id = ? AND closed_at IS NULL', [
        closedAt,
        closedBy,
        id,
      ]);
    },

    totals(shiftId: string): ShiftTotalsRow[] {
      return queryAll<ShiftTotalsRow>(
        db,
        `SELECT status, payment_method, COUNT(*) AS count, SUM(total_cents) AS total_cents
         FROM orders WHERE shift_id = ? GROUP BY status, payment_method`,
        [shiftId],
      );
    },
  };
}

export type ShiftsRepository = ReturnType<typeof createShiftsRepository>;
