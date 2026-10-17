<script setup lang="ts">
import { formatCents } from '@fastfood/shared';
import { PhCaretUp, PhMagnifyingGlass, PhMaskSad, PhX } from '@phosphor-icons/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CartPanel from '@/components/pos/CartPanel.vue';
import CategoryTabs from '@/components/pos/CategoryTabs.vue';
import OrderSuccessModal from '@/components/pos/OrderSuccessModal.vue';
import ProductCard from '@/components/pos/ProductCard.vue';
import ReadyOrdersStrip from '@/components/pos/ReadyOrdersStrip.vue';
import type { SentOrder } from '@/components/pos/types';
import EmptyState from '@/components/ui/EmptyState.vue';
import { useSettings } from '@/composables/useSettings';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { useCatalogStore } from '@/stores/catalog';
import { normalize } from '@/utils/format';
import { printReceipt } from '@/utils/receipt';

const catalog = useCatalogStore();
const cart = useCartStore();
const auth = useAuthStore();
const settings = useSettings();
const toast = useToast();

const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const category = ref<string | null>(null);
const cartOpen = ref(false); // gaveta do pedido em telas menores
const lastSent = ref<SentOrder | null>(null);

const categories = computed(() => [...new Set(catalog.available.map((p) => p.category))]);
const countByCategory = computed(() => {
  const counts: Record<string, number> = {};
  for (const p of catalog.available) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return counts;
});
const visible = computed(() => {
  const q = normalize(search.value.trim());
  return catalog.available.filter(
    (p) => (!category.value || p.category === category.value) && (!q || normalize(p.name).includes(q)),
  );
});

// Se o cardápio mudar (preço, item desativado), o carrinho acompanha.
watch(() => catalog.available, cart.syncWithCatalog);
// Categoria removida do cardápio volta para "Tudo".
watch(categories, (list) => {
  if (category.value && !list.includes(category.value)) category.value = null;
});

/** Enter na busca adiciona o primeiro resultado: agiliza o atendimento pelo teclado. */
function addFirstResult() {
  const first = visible.value[0];
  if (!first) return;
  cart.add(first);
  search.value = '';
}

function print(result: SentOrder) {
  if (!printReceipt(result.order, result)) {
    toast.error('O navegador bloqueou a impressão. Permita pop-ups para este site.');
  }
}

function onSent(result: SentOrder) {
  cartOpen.value = false;
  lastSent.value = result;
  if (settings.value.autoPrint) print(result);
}

function closeSuccess() {
  lastSent.value = null;
  searchInput.value?.focus();
}

// Atalho "/" foca a busca (exceto quando já se está digitando em algum campo).
function onKeydown(event: KeyboardEvent) {
  const typing = (event.target as HTMLElement).closest('input, textarea, select');
  if (event.key === '/' && !typing) {
    event.preventDefault();
    searchInput.value?.focus();
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

const greeting = computed(() => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
});
</script>

<template>
  <div
    class="relative grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_27rem]"
  >
    <!-- Cardápio -->
    <section class="min-h-0 overflow-y-auto px-4 pt-5 pb-28 sm:px-6 lg:pb-6" aria-label="Cardápio">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-stone-500">{{ greeting }}, {{ auth.user?.username }}</p>
          <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">Novo pedido</h1>
        </div>
        <div class="relative w-full sm:w-80">
          <PhMagnifyingGlass
            class="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            ref="searchInput"
            v-model="search"
            type="search"
            class="input h-12 rounded-2xl pr-12 pl-11 text-base"
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio (atalho: /)"
            aria-keyshortcuts="/"
            autocomplete="off"
            @keydown.enter.prevent="addFirstResult"
            @keydown.esc="search = ''"
          />
          <kbd
            v-if="!search"
            class="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-semibold text-stone-400 sm:block"
            >/</kbd
          >
          <button
            v-else
            type="button"
            class="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Limpar busca"
            @click="search = ''"
          >
            <PhX class="size-4" weight="bold" />
          </button>
        </div>
      </div>

      <ReadyOrdersStrip />

      <CategoryTabs v-model="category" :categories="categories" :counts="countByCategory" class="mb-5" />

      <div v-if="visible.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <ProductCard
          v-for="p in visible"
          :key="p.id"
          :product="p"
          :quantity="cart.quantityOf(p.id)"
          @add="cart.add"
        />
      </div>
      <EmptyState
        v-else
        :title="
          !catalog.loaded
            ? 'Carregando cardápio...'
            : search
              ? `Nada encontrado para “${search}”`
              : 'Cardápio vazio'
        "
        :description="
          catalog.loaded && !catalog.available.length
            ? auth.isAdmin
              ? 'Cadastre os produtos em Cardápio.'
              : 'Peça à gerência para cadastrar os produtos.'
            : undefined
        "
      >
        <template #icon><PhMaskSad class="size-8" aria-hidden="true" /></template>
      </EmptyState>
    </section>

    <!-- Pedido: coluna fixa no desktop, gaveta deslizante em telas menores -->
    <div
      v-if="cartOpen"
      class="fixed inset-0 z-40 bg-stone-950/50 backdrop-blur-sm lg:hidden"
      aria-hidden="true"
      @click="cartOpen = false"
    />
    <aside
      class="fixed inset-x-0 bottom-0 z-40 h-[88dvh] overflow-hidden rounded-t-3xl shadow-pop transition-transform duration-300 lg:static lg:z-auto lg:h-auto lg:translate-y-0 lg:rounded-none lg:border-l lg:border-stone-200 lg:shadow-none"
      :class="cartOpen ? 'translate-y-0' : 'translate-y-full'"
      aria-label="Pedido atual"
    >
      <CartPanel :closable="cartOpen" @sent="onSent" @close="cartOpen = false" />
    </aside>

    <!-- Barra flutuante para abrir o pedido em telas menores -->
    <button
      v-if="!cart.isEmpty && !cartOpen"
      type="button"
      class="fixed inset-x-4 bottom-20 z-30 flex items-center justify-between rounded-2xl bg-brand-600 px-5 py-4 text-white shadow-pop md:bottom-6 lg:hidden"
      @click="cartOpen = true"
    >
      <span class="flex items-center gap-3 font-semibold">
        <span
          class="flex size-8 items-center justify-center rounded-full bg-accent-400 font-display font-bold text-stone-900"
        >
          {{ cart.itemCount }}
        </span>
        Ver pedido
      </span>
      <span class="flex items-center gap-2 font-display text-lg font-bold tabular-nums">
        {{ formatCents(cart.totalCents) }} <PhCaretUp class="size-5" weight="bold" aria-hidden="true" />
      </span>
    </button>

    <OrderSuccessModal :result="lastSent" @close="closeSuccess" @print="print" />
  </div>
</template>
