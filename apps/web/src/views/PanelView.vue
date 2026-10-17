<script setup lang="ts">
import { DEFAULT_CUSTOMER } from '@fastfood/shared';
import { PhBellRinging } from '@phosphor-icons/vue';
import { computed, ref } from 'vue';
import BrandMark from '@/components/layout/BrandMark.vue';
import PanelGrid from '@/components/panel/PanelGrid.vue';
import { useChime } from '@/composables/useChime';
import { useNewArrivals } from '@/composables/useNewArrivals';
import { useNow } from '@/composables/useNow';
import { useOrdersStore } from '@/stores/orders';
import { formatTime } from '@/utils/format';

const orders = useOrdersStore();
const chime = useChime();
const now = useNow();
const highlight = ref(false);

// Mais recentes primeiro: a senha em destaque é a última que ficou pronta.
const ready = computed(() =>
  orders.withStatus('PRONTO').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
);
const preparing = computed(() => orders.withStatus('EM_PREPARO'));
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
  <div class="flex h-dvh flex-col overflow-hidden bg-stone-950 text-white" @click="chime.unlock()">
    <header class="flex items-center justify-between bg-ink px-10 py-4">
      <h1 class="flex items-center gap-4 font-display text-3xl font-bold">
        <BrandMark />
        Lanchonete
      </h1>
      <p
        v-if="!chime.unlocked.value"
        class="flex animate-pulse items-center gap-2 rounded-full bg-accent-400 px-4 py-1.5 text-sm font-semibold text-stone-900"
      >
        <PhBellRinging class="size-4" weight="fill" aria-hidden="true" /> Clique na tela para ativar o som
      </p>
      <span class="font-display text-4xl font-bold tabular-nums">{{ formatTime(now) }}</span>
    </header>

    <main
      class="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-6 p-6 lg:grid-cols-[5fr_7fr] lg:grid-rows-[minmax(0,1fr)]"
    >
      <!-- Senha chamada -->
      <section
        class="relative flex flex-col items-center justify-center overflow-hidden rounded-[2.5rem] bg-brand-600 p-8 text-center transition-transform duration-500"
        :class="highlight && 'scale-[1.02]'"
        aria-live="assertive"
      >
        <div class="absolute -right-20 -bottom-20 size-72 rounded-full bg-brand-500" aria-hidden="true" />
        <div class="absolute -top-16 -left-16 size-48 rounded-full bg-brand-700" aria-hidden="true" />
        <p class="relative font-display text-3xl font-semibold tracking-[0.3em] text-brand-100 uppercase">
          Senha
        </p>
        <p
          class="relative my-2 font-display text-[11rem] leading-none font-black text-accent-400 tabular-nums drop-shadow-lg transition-transform duration-500"
          :class="highlight && 'animate-bounce'"
        >
          {{ current ? current.number : '--' }}
        </p>
        <p v-if="!current" class="relative font-display text-5xl font-bold">Aguardando...</p>
        <p
          v-else-if="current.customer !== DEFAULT_CUSTOMER"
          class="relative max-w-full truncate font-display text-5xl font-bold"
        >
          {{ current.customer }}
        </p>
        <p v-if="current" class="relative mt-4 rounded-full bg-white/15 px-5 py-1.5 text-xl font-semibold">
          Retire no balcão
        </p>
      </section>

      <div class="grid min-h-0 grid-rows-2 gap-6">
        <section class="flex min-h-0 flex-col overflow-hidden rounded-[2rem] bg-stone-900 p-6">
          <h2 class="mb-4 flex items-center gap-3 font-display text-2xl font-bold text-emerald-400">
            <span class="size-3 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" /> Pode retirar
          </h2>
          <PanelGrid :orders="ready.slice(1)" tone="ready" />
        </section>
        <section class="flex min-h-0 flex-col overflow-hidden rounded-[2rem] bg-stone-900 p-6">
          <h2 class="mb-4 font-display text-2xl font-bold text-accent-400">Preparando</h2>
          <PanelGrid :orders="preparing" tone="preparing" />
        </section>
      </div>
    </main>
  </div>
</template>
