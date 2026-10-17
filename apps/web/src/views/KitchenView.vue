<script setup lang="ts">
import type { Order } from '@fastfood/shared';
import { PhSpeakerHigh, PhSpeakerSlash } from '@phosphor-icons/vue';
import { computed } from 'vue';
import KitchenColumn from '@/components/kitchen/KitchenColumn.vue';
import BrandMark from '@/components/layout/BrandMark.vue';
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
  { title: 'Novos', header: 'bg-brand-600 text-white', orders: orders.withStatus('NOVO') },
  { title: 'Em preparo', header: 'bg-accent-400 text-stone-900', orders: orders.withStatus('EM_PREPARO') },
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
  <div class="flex h-dvh flex-col bg-stone-950 text-stone-100">
    <header class="flex items-center justify-between gap-4 bg-ink px-6 py-3">
      <h1 class="flex items-center gap-3 font-display text-xl font-bold">
        <BrandMark size="sm" />
        Cozinha
      </h1>
      <div class="flex items-center gap-5">
        <button
          type="button"
          class="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
          :class="chime.unlocked.value ? 'text-stone-400' : 'animate-pulse bg-accent-400 text-stone-900'"
          @click="chime.unlock()"
        >
          <component
            :is="chime.unlocked.value ? PhSpeakerHigh : PhSpeakerSlash"
            class="size-5"
            aria-hidden="true"
          />
          {{ chime.unlocked.value ? 'Som ativo' : 'Toque para ativar o som' }}
        </button>
        <ConnectionIndicator dark />
        <span class="font-display text-2xl font-bold text-white tabular-nums">{{ formatTime(now) }}</span>
      </div>
    </header>

    <!-- Telas médias/grandes: cada coluna rola sozinha. Celular: a página inteira rola. -->
    <main
      class="grid min-h-0 flex-1 auto-rows-max gap-5 overflow-y-auto p-5 md:grid-cols-2 md:grid-rows-[minmax(0,1fr)] md:overflow-hidden"
    >
      <KitchenColumn
        v-for="col in columns"
        :key="col.title"
        :title="col.title"
        :header-class="col.header"
        :orders="col.orders"
        :now="now"
        @advance="advance"
      />
    </main>
  </div>
</template>
