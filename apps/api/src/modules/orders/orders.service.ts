import { randomUUID } from 'node:crypto';
import {
  canTransition,
  DEFAULT_CUSTOMER,
  ORDER_STATUS_LABELS,
  type CreateOrderInput,
  type Order,
  type OrderItem,
  type UpdateOrderStatusInput,
  type User,
} from '@fastfood/shared';
import type { z } from 'zod';
import { transaction, type Database } from '../../db/database.ts';
import { AppError, badRequest, conflict, forbidden, notFound } from '../../lib/errors.ts';
import type { EventBus } from '../../lib/events.ts';
import type { ProductsRepository } from '../products/products.repository.ts';
import type { ShiftsService } from '../shifts/shifts.service.ts';
import type { OrdersRepository } from './orders.repository.ts';

type CreateOrder = z.output<typeof CreateOrderInput>;
type UpdateOrderStatus = z.output<typeof UpdateOrderStatusInput>;

interface Deps {
  db: Database;
  orders: OrdersRepository;
  products: ProductsRepository;
  shifts: ShiftsService;
  bus: EventBus;
}

export function createOrdersService({ db, orders, products, shifts, bus }: Deps) {
  return {
    list(shiftId?: string): Order[] {
      const shift = shiftId ? shifts.findById(shiftId) : shifts.ensureOpenShift();
      return orders.listByShift(shift.id);
    },

    /** Cria o pedido com preços do cardápio e o próximo número de senha do turno, numa única transação. */
    create(input: CreateOrder, actor: User): Order {
      const quantities = new Map<string, number>();
      for (const i of input.items)
        quantities.set(i.productId, (quantities.get(i.productId) ?? 0) + i.quantity);

      const order = transaction(db, () => {
        const sellable = products.findSellable([...quantities.keys()]);
        if (sellable.length !== quantities.size) {
          throw conflict(
            'PRODUCT_UNAVAILABLE',
            'Algum item do pedido não está mais disponível. Revise o carrinho.',
          );
        }

        const items: OrderItem[] = sellable.map((p) => ({
          productId: p.id,
          name: p.name,
          unitPriceCents: p.priceCents,
          quantity: quantities.get(p.id)!,
        }));
        const shift = shifts.ensureOpenShift();
        const id = randomUUID();

        orders.insert({
          id,
          shiftId: shift.id,
          number: orders.nextNumber(shift.id),
          status: 'NOVO',
          customer: input.customer || DEFAULT_CUSTOMER,
          note: input.note,
          paymentMethod: input.paymentMethod,
          totalCents: items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0),
          items,
          createdBy: actor.id,
          createdAt: new Date().toISOString(),
        });
        return orders.findById(id)!;
      });

      bus.emit('order:created', order);
      return order;
    },

    updateStatus(id: string, { status, reason }: UpdateOrderStatus, actor: User): Order {
      const order = transaction(db, () => {
        const current = orders.findById(id);
        if (!current) throw notFound('Pedido não encontrado.');

        if (!canTransition(current.status, status)) {
          throw conflict(
            'INVALID_TRANSITION',
            `O pedido #${current.number} está "${ORDER_STATUS_LABELS[current.status]}" e não pode ir para "${ORDER_STATUS_LABELS[status]}".`,
          );
        }
        if (status === 'CANCELADO') {
          if (actor.role !== 'admin') throw forbidden('Somente a gerência pode cancelar pedidos.');
          if (!reason) throw badRequest('REASON_REQUIRED', 'Informe o motivo do cancelamento.');
        }

        if (!orders.updateStatus(id, current.status, status, status === 'CANCELADO' ? reason! : null)) {
          throw new AppError(
            409,
            'INVALID_TRANSITION',
            'Este pedido acabou de ser atualizado em outra tela.',
          );
        }
        return orders.findById(id)!;
      });

      bus.emit('order:updated', order);
      return order;
    },
  };
}

export type OrdersService = ReturnType<typeof createOrdersService>;
