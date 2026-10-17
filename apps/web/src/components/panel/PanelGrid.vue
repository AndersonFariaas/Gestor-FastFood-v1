<script setup lang="ts">
import { DEFAULT_CUSTOMER, type Order } from '@fastfood/shared';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ orders: Order[]; tone: 'ready' | 'preparing' }>();

/**
 * A TV não tem rolagem: mostra só as senhas que cabem no espaço disponível e resume o restante
 * em um bloco "+N". A capacidade é recalculada quando a tela muda de tamanho.
 */
const grid = ref<HTMLElement | null>(null);
const capacity = ref(Infinity);

function measure() {
  const el = grid.value;
  const tile = el?.querySelector<HTMLElement>('[data-tile]');
  if (!el || !tile) return;
  const style = getComputedStyle(el);
  const gap = parseFloat(style.rowGap) || 0;
  const columns = style.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
  const rows = Math.max(1, Math.floor((el.clientHeight + gap) / (tile.offsetHeight + gap)));
  capacity.value = rows * columns;
}

const overflow = computed(() => Math.max(0, props.orders.length - capacity.value));
const visible = computed(() =>
  overflow.value ? props.orders.slice(0, Math.max(0, capacity.value - 1)) : props.orders,
);
const hiddenCount = computed(() => props.orders.length - visible.value.length);

let observer: ResizeObserver | null = null;
onMounted(() => {
  observer = new ResizeObserver(measure);
  if (grid.value) observer.observe(grid.value);
  measure();
});
onBeforeUnmount(() => observer?.disconnect());
watch(
  () => props.orders.length,
  async () => {
    await nextTick();
    measure();
  },
);

const STYLES = {
  ready: {
    tile: 'bg-emerald-500/10 ring-1 ring-emerald-500/30',
    number: 'text-5xl text-emerald-400',
    name: 'text-stone-300',
  },
  preparing: { tile: 'bg-white/5', number: 'text-4xl text-stone-200', name: 'text-stone-500' },
};
</script>

<template>
  <div
    ref="grid"
    class="grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] content-start gap-4 overflow-hidden"
  >
    <div
      v-for="o in visible"
      :key="o.id"
      data-tile
      class="flex h-24 flex-col items-center justify-center rounded-2xl px-3 text-center 2xl:h-28"
      :class="STYLES[tone].tile"
    >
      <p class="font-display leading-none font-bold tabular-nums" :class="STYLES[tone].number">
        {{ o.number }}
      </p>
      <p
        v-if="o.customer !== DEFAULT_CUSTOMER"
        class="mt-1.5 w-full truncate text-sm"
        :class="STYLES[tone].name"
      >
        {{ o.customer }}
      </p>
    </div>
    <div
      v-if="hiddenCount"
      data-tile
      class="flex h-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 text-center 2xl:h-28"
    >
      <p class="font-display text-4xl leading-none font-bold text-stone-300 tabular-nums">
        +{{ hiddenCount }}
      </p>
      <p class="mt-1.5 text-sm text-stone-500">{{ hiddenCount === 1 ? 'senha' : 'senhas' }}</p>
    </div>
  </div>
</template>
