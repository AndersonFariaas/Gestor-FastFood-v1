<script setup lang="ts">
import type { Order } from '@fastfood/shared';
import { PhArrowDown } from '@phosphor-icons/vue';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import KitchenTicket from './KitchenTicket.vue';

const props = defineProps<{ title: string; headerClass: string; orders: Order[]; now: Date }>();
const emit = defineEmits<{ advance: [order: Order] }>();

/** Altura reservada para o aviso flutuante no rodapé da coluna. */
const HINT_ZONE_PX = 80;

const list = ref<HTMLElement | null>(null);
const hiddenBelow = ref(0);

/**
 * Conta os pedidos que estão abaixo da área visível ou cobertos pelo aviso do rodapé.
 * Em telas pequenas a página inteira rola (a lista não tem rolagem própria) e o aviso não aparece.
 */
function measure() {
  const el = list.value;
  if (!el || el.scrollHeight <= el.clientHeight) {
    hiddenBelow.value = 0;
    return;
  }
  const limit = el.getBoundingClientRect().bottom - HINT_ZONE_PX;
  hiddenBelow.value = [...el.querySelectorAll('article')].filter(
    (a) => a.getBoundingClientRect().bottom > limit,
  ).length;
}

function scrollDown() {
  list.value?.scrollBy({ top: list.value.clientHeight * 0.8, behavior: 'smooth' });
}

let observer: ResizeObserver | null = null;
onMounted(() => {
  observer = new ResizeObserver(measure);
  if (list.value) observer.observe(list.value);
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
</script>

<template>
  <section class="flex flex-col overflow-hidden rounded-3xl bg-stone-900 ring-1 ring-white/5 md:min-h-0">
    <h2
      class="flex shrink-0 items-center justify-between px-5 py-3.5 font-display text-lg font-bold uppercase"
      :class="headerClass"
    >
      {{ title }}
      <span class="rounded-full bg-black/20 px-3 py-0.5 text-base tabular-nums">{{ orders.length }}</span>
    </h2>

    <div class="relative flex min-h-0 flex-1 flex-col">
      <!--
        `auto-rows-max` impede que os cards sejam espremidos quando há muitos pedidos:
        a lista rola em vez de encolher as linhas da grade.
      -->
      <div
        ref="list"
        class="grid flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] content-start gap-4 p-4 md:overflow-y-auto md:overscroll-contain md:pb-24"
        @scroll.passive="measure"
      >
        <KitchenTicket
          v-for="o in orders"
          :key="o.id"
          :order="o"
          :now="now"
          @advance="emit('advance', $event)"
        />
        <p v-if="!orders.length" class="col-span-full py-16 text-center text-stone-500">
          Nenhum pedido aqui.
        </p>
      </div>

      <Transition
        enter-from-class="opacity-0 translate-y-2"
        enter-active-class="transition duration-200"
        leave-to-class="opacity-0"
        leave-active-class="transition duration-150"
      >
        <div
          v-if="hiddenBelow"
          class="pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-linear-to-t from-stone-900 via-stone-900/80 to-transparent pb-4"
        >
          <button
            type="button"
            class="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-900 shadow-pop transition hover:bg-accent-300"
            @click="scrollDown"
          >
            <PhArrowDown class="size-4" weight="bold" aria-hidden="true" />
            {{ hiddenBelow }} {{ hiddenBelow === 1 ? 'pedido abaixo' : 'pedidos abaixo' }}
          </button>
        </div>
      </Transition>
    </div>
  </section>
</template>
