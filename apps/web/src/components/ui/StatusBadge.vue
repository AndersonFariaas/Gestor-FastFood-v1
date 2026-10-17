<script setup lang="ts">
import { ORDER_STATUS_LABELS, type OrderStatus } from '@fastfood/shared';

defineProps<{ status: OrderStatus }>();

const STYLES: Record<OrderStatus, { badge: string; dot: string }> = {
  NOVO: { badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  EM_PREPARO: { badge: 'bg-accent-50 text-amber-800 ring-accent-200', dot: 'bg-accent-500' },
  PRONTO: { badge: 'bg-brand-50 text-brand-700 ring-brand-200', dot: 'bg-brand-500 animate-pulse' },
  ENTREGUE: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  CANCELADO: { badge: 'bg-stone-100 text-stone-500 ring-stone-200', dot: 'bg-stone-400' },
};
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset"
    :class="STYLES[status].badge"
  >
    <span class="size-1.5 rounded-full" :class="STYLES[status].dot" aria-hidden="true" />
    {{ ORDER_STATUS_LABELS[status] }}
  </span>
</template>
