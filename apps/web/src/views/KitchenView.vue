<script setup lang="ts">
import type { Order } from '@fastfood/shared';
import { PhCookingPot, PhSpeakerHigh, PhSpeakerSlash } from '@phosphor-icons/vue';
import { computed } from 'vue';
import KitchenTicket from '@/components/kitchen/KitchenTicket.vue';
import ConnectionIndicator from '@/components/layout/ConnectionIndicator.vue';
import { useChime } from '@/composables/useChime';
import { useNewArrivals } from '@/composables/useNewArrivals';
import { useNow } from '@/composables/useNow';
import { useToast } from '@/composables/useToast';
import { errorMessage } from '@/services/http';
import { useOrdersStore } from '@/stores/orders';
import { formatTime } from '@/utils/format';

const orders = useOrdersStore();
const toast = useToast();
const chime = useChime();
const now = useNow(15_000);

const columns = computed(() => [
  { title: 'Novos pedidos', header: 'bg-blue-600', orders: orders.withStatus('NOVO') },
  { title: 'Em preparo', header: 'bg-amber-600', orders: orders.withStatus('EM_PREPARO') },
]);

useNewArrivals(
  computed(() => orders.withStatus('NOVO').map((o) => o.id)),
  computed(() => orders.loaded),
  () => chime.play('new-order'),
);

async function advance(order: Order) {
  try {
    await orders.setStatus(order.id, order.status === 'NOVO' ? 'EM_PREPARO' : 'PRONTO');
  } catch (err) {
    toast.error(errorMessage(err));
  }
}
</script>

<template>
  <div class="flex h-dvh flex-col bg-gray-900 text-gray-100">
    <header class="flex items-center justify-between gap-4 border-b border-gray-700 bg-gray-800 px-6 py-2">
      <h1 class="flex items-center gap-2 text-sm font-bold tracking-[0.2em] text-gray-300 uppercase">
        <PhCookingPot class="size-6 text-brand-500" weight="fill" aria-hidden="true" />
        Cozinha
      </h1>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
          :class="chime.unlocked.value ? 'text-gray-400' : 'animate-pulse bg-amber-500/20 text-amber-300'"
          @click="chime.unlock()"
        >
          <component
            :is="chime.unlocked.value ? PhSpeakerHigh : PhSpeakerSlash"
            class="size-4"
            aria-hidden="true"
          />
          {{ chime.unlocked.value ? 'Som ativo' : 'Toque para ativar o som' }}
        </button>
        <ConnectionIndicator dark />
        <span class="text-lg font-bold text-gray-400 tabular-nums">{{ formatTime(now) }}</span>
      </div>
    </header>

    <main class="grid min-h-0 flex-1 gap-6 p-6 md:grid-cols-2">
      <section
        v-for="col in columns"
        :key="col.title"
        class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-lg"
      >
        <h2
          class="flex items-center justify-between px-4 py-3 font-bold text-white uppercase"
          :class="col.header"
        >
          {{ col.title }}
          <span class="rounded-full bg-black/30 px-3 py-0.5 text-sm">{{ col.orders.length }}</span>
        </h2>
        <div class="flex-1 space-y-4 overflow-y-auto p-4">
          <KitchenTicket v-for="o in col.orders" :key="o.id" :order="o" :now="now" @advance="advance" />
          <p v-if="!col.orders.length" class="py-10 text-center text-sm text-gray-500">Nenhum pedido aqui.</p>
        </div>
      </section>
    </main>
  </div>
</template>
