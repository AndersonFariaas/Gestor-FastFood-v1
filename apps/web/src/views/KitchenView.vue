<script setup lang="ts">
import type { Order } from '@fastfood/shared';
import { PhSpeakerHigh, PhSpeakerSlash } from '@phosphor-icons/vue';
import { computed } from 'vue';
import KitchenTicket from '@/components/kitchen/KitchenTicket.vue';
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

    <main class="grid min-h-0 flex-1 gap-5 p-5 md:grid-cols-2">
      <section
        v-for="col in columns"
        :key="col.title"
        class="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-stone-900 ring-1 ring-white/5"
      >
        <h2
          class="flex items-center justify-between px-5 py-3.5 font-display text-lg font-bold uppercase"
          :class="col.header"
        >
          {{ col.title }}
          <span class="rounded-full bg-black/20 px-3 py-0.5 text-base tabular-nums">{{
            col.orders.length
          }}</span>
        </h2>
        <div class="grid flex-1 content-start gap-4 overflow-y-auto p-4 xl:grid-cols-2">
          <KitchenTicket v-for="o in col.orders" :key="o.id" :order="o" :now="now" @advance="advance" />
          <p v-if="!col.orders.length" class="col-span-full py-16 text-center text-stone-500">
            Nenhum pedido aqui.
          </p>
        </div>
      </section>
    </main>
  </div>
</template>
