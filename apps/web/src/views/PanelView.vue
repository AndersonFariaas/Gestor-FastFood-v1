<script setup lang="ts">
import { PhBellRinging, PhHamburger } from '@phosphor-icons/vue';
import { computed, ref } from 'vue';
import { useChime } from '@/composables/useChime';
import { useNewArrivals } from '@/composables/useNewArrivals';
import { useNow } from '@/composables/useNow';
import { useOrdersStore } from '@/stores/orders';
import { formatTime } from '@/utils/format';

const GRID_SIZE = 12;

const orders = useOrdersStore();
const chime = useChime();
const now = useNow();
const highlight = ref(false);

// Mais recentes primeiro: a senha em destaque é a última que ficou pronta.
const ready = computed(() =>
  orders.withStatus('PRONTO').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
);
const preparing = computed(() => orders.withStatus('EM_PREPARO').slice(0, GRID_SIZE));
const current = computed(() => ready.value[0] ?? null);

useNewArrivals(
  computed(() => ready.value.map((o) => o.id)),
  computed(() => orders.loaded),
  () => {
    chime.play('order-ready');
    highlight.value = true;
    setTimeout(() => (highlight.value = false), 4000);
  },
);
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-gray-950 text-white" @click="chime.unlock()">
    <header class="flex items-center justify-between bg-black px-10 py-4">
      <h1 class="flex items-center gap-3 text-2xl font-black tracking-widest uppercase">
        <PhHamburger class="size-9 text-brand-500" weight="fill" aria-hidden="true" /> Lanchonete
      </h1>
      <p
        v-if="!chime.unlocked.value"
        class="flex animate-pulse items-center gap-2 rounded-full bg-amber-500/20 px-4 py-1 text-sm text-amber-300"
      >
        <PhBellRinging class="size-4" aria-hidden="true" /> Clique na tela para ativar o som
      </p>
      <span class="text-3xl font-bold text-gray-500 tabular-nums">{{ formatTime(now) }}</span>
    </header>

    <main class="grid min-h-0 flex-1 grid-cols-1 gap-8 p-8 lg:grid-cols-[2fr_3fr]">
      <section
        class="flex flex-col items-center justify-center rounded-3xl border-2 bg-gray-900 p-8 text-center transition-colors duration-500"
        :class="highlight ? 'border-brand-500 bg-brand-500/10' : 'border-gray-800'"
        aria-live="assertive"
      >
        <p class="text-2xl font-bold tracking-[0.3em] text-gray-400 uppercase">Senha</p>
        <p
          class="my-4 text-[10rem] leading-none font-black tabular-nums transition-all duration-500"
          :class="highlight ? 'scale-110 text-brand-500' : 'text-green-500'"
        >
          {{ current ? current.number : '--' }}
        </p>
        <p class="max-w-full truncate text-4xl font-semibold text-gray-200">
          {{ current ? current.customer : 'Aguardando...' }}
        </p>
      </section>

      <div class="grid min-h-0 grid-rows-2 gap-8">
        <section class="flex min-h-0 flex-col">
          <h2 class="mb-4 text-xl font-bold tracking-widest text-green-400 uppercase">
            Prontos — retire no balcão
          </h2>
          <div class="grid flex-1 grid-cols-3 content-start gap-4 xl:grid-cols-4">
            <div
              v-for="o in ready.slice(1, GRID_SIZE + 1)"
              :key="o.id"
              class="rounded-xl border border-green-700/50 bg-green-900/20 p-4 text-center"
            >
              <p class="text-4xl font-black text-green-400 tabular-nums">{{ o.number }}</p>
              <p class="mt-1 truncate text-sm text-gray-300">{{ o.customer }}</p>
            </div>
          </div>
        </section>
        <section class="flex min-h-0 flex-col">
          <h2 class="mb-4 text-xl font-bold tracking-widest text-amber-400 uppercase">Em preparo</h2>
          <div class="grid flex-1 grid-cols-3 content-start gap-4 xl:grid-cols-4">
            <div
              v-for="o in preparing"
              :key="o.id"
              class="rounded-xl border border-amber-700/30 bg-amber-900/10 p-4 text-center"
            >
              <p class="text-3xl font-black text-amber-500 tabular-nums">{{ o.number }}</p>
              <p class="mt-1 truncate text-sm text-gray-400">{{ o.customer }}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
