<script setup lang="ts">
import { formatCents } from '@fastfood/shared';
import { PhMagnifyingGlass, PhMaskSad } from '@phosphor-icons/vue';
import { computed, ref, watch } from 'vue';
import CartPanel from '@/components/pos/CartPanel.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { useCartStore } from '@/stores/cart';
import { useCatalogStore } from '@/stores/catalog';
import { normalize } from '@/utils/format';

const catalog = useCatalogStore();
const cart = useCartStore();

const search = ref('');
const category = ref<string | null>(null);

const categories = computed(() => [...new Set(catalog.available.map((p) => p.category))]);
const visible = computed(() => {
  const q = normalize(search.value.trim());
  return catalog.available.filter(
    (p) => (!category.value || p.category === category.value) && (!q || normalize(p.name).includes(q)),
  );
});

// Se o cardápio mudar (preço, item desativado), o carrinho acompanha.
watch(() => catalog.available, cart.syncWithCatalog);

const chipClass = (active: boolean) =>
  active
    ? 'border-brand-500 bg-brand-500 text-white'
    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100';
</script>

<template>
  <div class="grid h-full min-h-0 lg:grid-cols-[1fr_24rem]">
    <section class="min-h-0 overflow-y-auto p-4 sm:p-6" aria-label="Cardápio">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Novo pedido</h1>
          <p class="text-sm text-gray-500">Monte o pedido e envie para a cozinha.</p>
        </div>
        <div class="relative w-full sm:w-72">
          <PhMagnifyingGlass class="absolute top-2.5 left-3 size-5 text-gray-400" aria-hidden="true" />
          <input
            v-model="search"
            type="search"
            class="input pl-10"
            placeholder="Buscar item..."
            aria-label="Buscar item"
            autocomplete="off"
          />
        </div>
      </div>

      <div class="mb-5 flex flex-wrap gap-2" role="group" aria-label="Categorias">
        <button
          type="button"
          class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
          :class="chipClass(category === null)"
          :aria-pressed="category === null"
          @click="category = null"
        >
          Todos
        </button>
        <button
          v-for="c in categories"
          :key="c"
          type="button"
          class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
          :class="chipClass(category === c)"
          :aria-pressed="category === c"
          @click="category = c"
        >
          {{ c }}
        </button>
      </div>

      <div v-if="visible.length" class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <button
          v-for="p in visible"
          :key="p.id"
          type="button"
          class="group flex flex-col justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-brand-500 hover:shadow-md focus-visible:ring-4 focus-visible:ring-brand-500/30 focus-visible:outline-none active:scale-[0.98]"
          @click="cart.add(p)"
        >
          <div>
            <span
              class="mb-2 inline-block rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600"
            >
              {{ p.category }}
            </span>
            <strong class="block leading-tight text-gray-800 group-hover:text-brand-600">{{ p.name }}</strong>
            <small v-if="p.description" class="mt-1 line-clamp-2 block text-gray-500">{{
              p.description
            }}</small>
          </div>
          <span class="text-lg font-black text-brand-500 tabular-nums">{{ formatCents(p.priceCents) }}</span>
        </button>
      </div>
      <EmptyState
        v-else
        :title="catalog.loaded ? 'Nenhum item encontrado' : 'Carregando cardápio...'"
        :description="catalog.loaded && !catalog.available.length ? 'Cadastre itens em Cardápio.' : undefined"
      >
        <template #icon><PhMaskSad class="mb-3 size-10 text-gray-300" aria-hidden="true" /></template>
      </EmptyState>
    </section>

    <CartPanel />
  </div>
</template>
