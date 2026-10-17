<script setup lang="ts">
import type { Order } from '@fastfood/shared';
import { PhBellRinging, PhCheck } from '@phosphor-icons/vue';
import { computed, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { errorMessage } from '@/services/http';
import { useOrdersStore } from '@/stores/orders';

const orders = useOrdersStore();
const toast = useToast();
const busy = ref<string | null>(null);

// Mais antigos primeiro: quem espera há mais tempo é atendido antes.
const ready = computed(() =>
  orders.withStatus('PRONTO').sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)),
);

async function deliver(order: Order) {
  busy.value = order.id;
  try {
    await orders.setStatus(order.id, 'ENTREGUE');
    toast.success(`Senha ${order.number} entregue.`);
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <Transition
    enter-from-class="opacity-0 -translate-y-2"
    enter-active-class="transition duration-200"
    leave-to-class="opacity-0"
    leave-active-class="transition duration-150"
  >
    <section
      v-if="ready.length"
      class="mb-5 flex items-center gap-3 overflow-hidden rounded-2xl bg-ink p-2 pl-4 text-white shadow-card"
      aria-label="Pedidos prontos para entregar"
    >
      <p class="flex shrink-0 items-center gap-2 text-sm font-semibold">
        <PhBellRinging class="size-5 animate-pulse text-accent-400" weight="fill" aria-hidden="true" />
        <span class="hidden sm:inline">Prontos para entregar</span>
      </p>
      <ul class="scrollbar-none flex flex-1 gap-2 overflow-x-auto">
        <li v-for="o in ready" :key="o.id">
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl bg-white/10 py-1.5 pr-1.5 pl-3 text-sm whitespace-nowrap transition hover:bg-white/20 disabled:opacity-50"
            :disabled="busy === o.id"
            :aria-label="`Entregar senha ${o.number} de ${o.customer}`"
            @click="deliver(o)"
          >
            <span class="font-display text-lg font-bold text-accent-400 tabular-nums">{{ o.number }}</span>
            <span class="max-w-28 truncate text-stone-300">{{ o.customer }}</span>
            <span class="flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-xs font-bold">
              <PhCheck class="size-3.5" weight="bold" aria-hidden="true" /> Entregar
            </span>
          </button>
        </li>
      </ul>
    </section>
  </Transition>
</template>
