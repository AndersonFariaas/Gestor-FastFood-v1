import { randomUUID } from 'node:crypto';
import {
  OPEN_ORDER_STATUSES,
  ORDER_STATUSES,
  type OrderStatus,
  type Shift,
  type ShiftSummary,
  type User,
} from '@fastfood/shared';
import { transaction, type Database } from '../../db/database.ts';
import { conflict, notFound } from '../../lib/errors.ts';
import type { EventBus } from '../../lib/events.ts';
import type { ShiftsRepository } from './shifts.repository.ts';

interface Deps {
  db: Database;
  shifts: ShiftsRepository;
  bus: EventBus;
}

const HISTORY_LIMIT = 60;

export function createShiftsService({ db, shifts, bus }: Deps) {
  const summarize = (shift: Shift): ShiftSummary => {
    const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
    const summary: ShiftSummary = { shift, revenueCents: 0, openCents: 0, counts, byPaymentMethod: {} };

    for (const row of shifts.totals(shift.id)) {
      counts[row.status] += row.count;
      if (row.status === 'ENTREGUE') {
        summary.revenueCents += row.total_cents;
        summary.byPaymentMethod[row.payment_method] =
          (summary.byPaymentMethod[row.payment_method] ?? 0) + row.total_cents;
      } else if (OPEN_ORDER_STATUSES.includes(row.status)) {
        summary.openCents += row.total_cents;
      }
    }
    return summary;
  };

  const openNew = (openedBy: string | null): Shift => {
    const id = randomUUID();
    shifts.insert(id, new Date().toISOString(), openedBy);
    return shifts.findById(id)!;
  };

  /** Garante a invariável "sempre existe um turno aberto". */
  const ensureOpenShift = (): Shift => transaction(db, () => shifts.findOpen() ?? openNew(null));

  return {
    ensureOpenShift,

    currentSummary: (): ShiftSummary => summarize(ensureOpenShift()),

    history(): ShiftSummary[] {
      return shifts.listClosed(HISTORY_LIMIT).map(summarize);
    },

    findById(id: string): Shift {
      const shift = shifts.findById(id);
      if (!shift) throw notFound('Turno não encontrado.');
      return shift;
    },

    /** Fecha o turno atual (exige que não haja pedidos em andamento) e abre o próximo. */
    close(actor: User): ShiftSummary {
      const closed = transaction(db, () => {
        const current = ensureOpenShift();
        const summary = summarize(current);
        const open = OPEN_ORDER_STATUSES.reduce((n, s) => n + summary.counts[s], 0);
        if (open > 0) {
          throw conflict(
            'OPEN_ORDERS',
            `Existem ${open} pedido(s) em andamento. Entregue ou cancele antes de fechar o caixa.`,
          );
        }
        shifts.close(current.id, new Date().toISOString(), actor.id);
        openNew(actor.id);
        return summarize(shifts.findById(current.id)!);
      });

      bus.emit('shift:closed', { shiftId: closed.shift.id });
      return closed;
    },
  };
}

export type ShiftsService = ReturnType<typeof createShiftsService>;
