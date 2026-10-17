<script setup lang="ts">
import { LATE_ORDER_MINUTES, type Order } from '@fastfood/shared';
import { PhCheck, PhClock, PhCookingPot, PhWarningCircle } from '@phosphor-icons/vue';
import { computed, ref } from 'vue';
import { minutesSince } from '@/utils/format';

const props = defineProps<{ order: Order; now: Date }>();
const emit = defineEmits<{ advance: [order: Order] }>();

const busy = ref(false);
const minutes = computed(() => minutesSince(props.order.createdAt, props.now));
const late = computed(() => minutes.value >= LATE_ORDER_MINUTES);
const isNew = computed(() => props.order.status === 'NOVO');

function advance() {
  if (busy.value) return;
  busy.value = true; // evita duplo toque enquanto o servidor confirma (o card é recriado em seguida)
  emit('advance', props.order);
  setTimeout(() => (busy.value = false), 1500);
}
</script>

<template>
  <article
    class="rounded-xl border-l-4 bg-gray-700 p-4 shadow-md"
    :class="late ? 'border-red-500' : 'border-gray-500'"
    :aria-label="`Pedido ${order.number}`"
  >
    <header class="mb-3 flex items-start justify-between gap-3 border-b border-gray-600 pb-2">
      <div class="min-w-0">
        <strong class="block text-2xl text-white">#{{ order.number }}</strong>
        <span class="block truncate text-sm text-gray-400">{{ order.customer }}</span>
      </div>
      <span
        class="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium tabular-nums"
        :class="late ? 'bg-red-500/20 text-red-300' : 'bg-gray-600 text-gray-300'"
      >
        <PhClock class="size-4" weight="bold" aria-hidden="true" /> {{ minutes }} min
      </span>
    </header>

    <ul class="mb-4 space-y-1.5 text-gray-100">
      <li v-for="(item, i) in order.items" :key="i" class="flex gap-2 text-lg leading-snug">
        <strong class="text-white tabular-nums">{{ item.quantity }}x</strong>
        <span>{{ item.name }}</span>
      </li>
    </ul>

    <p
      v-if="order.note"
      class="mb-4 flex gap-2 rounded-lg border border-gray-600 bg-gray-800 p-3 text-sm text-brand-200"
    >
      <PhWarningCircle class="mt-0.5 size-4 shrink-0" weight="bold" aria-hidden="true" />
      <span><strong>Obs:</strong> {{ order.note }}</span>
    </p>

    <button
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold text-white transition-colors disabled:opacity-60"
      :class="isNew ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'"
      :disabled="busy"
      @click="advance"
    >
      <component :is="isNew ? PhCookingPot : PhCheck" class="size-5" weight="bold" aria-hidden="true" />
      {{ isNew ? 'Preparar' : 'Pronto' }}
    </button>
  </article>
</template>
