<script setup lang="ts">
import { ORDER_STATUS_LABELS, type OrderStatus } from '@fastfood/shared';

defineProps<{ status: OrderStatus }>();

const COLORS: Record<OrderStatus, string> = {
  NOVO: 'bg-blue-100 text-blue-700',
  EM_PREPARO: 'bg-amber-100 text-amber-800',
  PRONTO: 'bg-brand-100 text-brand-700',
  ENTREGUE: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};
</script>

<template>
  <span
    class="inline-block rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap"
    :class="COLORS[status]"
  >
    {{ ORDER_STATUS_LABELS[status] }}
  </span>
</template>
