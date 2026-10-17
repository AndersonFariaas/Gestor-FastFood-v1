import type { CreateOrderInput, Order, OrderStatus } from '@fastfood/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/services/api';

/** Pedidos do turno atual, mantidos em sincronia pelos eventos de tempo real. */
export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([]);
  const loaded = ref(false);

  const sorted = computed(() => [...orders.value].sort((a, b) => a.number - b.number));

  const withStatus = (status: OrderStatus) => sorted.value.filter((o) => o.status === status);

  const countByStatus = computed(() => {
    const counts: Partial<Record<OrderStatus, number>> = {};
    for (const o of orders.value) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  });

  async function load() {
    orders.value = await api.orders.list();
    loaded.value = true;
  }

  async function create(input: CreateOrderInput) {
    const order = await api.orders.create(input);
    upsert(order);
    return order;
  }

  async function setStatus(id: string, status: OrderStatus, reason?: string) {
    const order = await api.orders.updateStatus(id, { status, ...(reason && { reason }) });
    upsert(order);
    return order;
  }

  function upsert(order: Order) {
    const index = orders.value.findIndex((o) => o.id === order.id);
    if (index === -1) orders.value.push(order);
    // Eventos podem chegar fora de ordem: mantém a versão mais recente.
    else if (order.updatedAt >= orders.value[index]!.updatedAt) orders.value[index] = order;
  }

  return { orders, loaded, sorted, withStatus, countByStatus, load, create, setStatus, upsert };
});
