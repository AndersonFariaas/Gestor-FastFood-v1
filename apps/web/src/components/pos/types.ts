import type { Order } from '@fastfood/shared';

/** Pedido recém-enviado pelo caixa, com os dados de troco (que não são guardados no servidor). */
export interface SentOrder {
  order: Order;
  receivedCents: number | null;
  changeCents: number | null;
}
