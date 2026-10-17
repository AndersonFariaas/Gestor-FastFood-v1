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
    class="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-stone-800 shadow-lg ring-2 transition-shadow"
    :class="late ? 'ring-brand-500 shadow-brand-950/50' : 'ring-white/5'"
    :aria-label="`Pedido ${order.number}`"
  >
    <header class="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
      <div class="min-w-0">
        <p class="font-display text-4xl leading-none font-bold text-accent-400 tabular-nums">
          {{ order.number }}
        </p>
        <p class="mt-1 truncate text-sm font-medium text-stone-400">{{ order.customer }}</p>
      </div>
      <span
        class="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums"
        :class="late ? 'animate-pulse bg-brand-600 text-white' : 'bg-white/10 text-stone-300'"
      >
        <PhClock class="size-4" weight="bold" aria-hidden="true" /> {{ minutes }} min
      </span>
    </header>

    <ul class="space-y-1.5 border-t border-dashed border-white/10 px-4 py-3 text-stone-100">
      <li v-for="(item, i) in order.items" :key="i" class="flex gap-3 text-lg leading-snug">
        <span
          class="flex h-7 min-w-7 items-center justify-center rounded-lg bg-white/10 px-1.5 font-display font-bold text-white tabular-nums"
        >
          {{ item.quantity }}
        </span>
        <span class="min-w-0 pt-0.5 break-words">{{ item.name }}</span>
      </li>
    </ul>

    <p v-if="order.note" class="mx-4 mb-3 flex gap-2 rounded-xl bg-accent-400/15 p-3 text-sm text-accent-200">
      <PhWarningCircle class="mt-0.5 size-4 shrink-0" weight="fill" aria-hidden="true" />
      <span class="min-w-0 break-words"><strong>Obs:</strong> {{ order.note }}</span>
    </p>

    <div class="mt-auto p-3 pt-1">
      <button
        type="button"
        class="flex h-14 w-full items-center justify-center gap-2 rounded-xl font-display text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-60"
        :class="
          isNew
            ? 'bg-accent-400 text-stone-900 hover:bg-accent-300'
            : 'bg-emerald-500 text-white hover:bg-emerald-400'
        "
        :disabled="busy"
        @click="advance"
      >
        <component :is="isNew ? PhCookingPot : PhCheck" class="size-6" weight="bold" aria-hidden="true" />
        {{ isNew ? 'Iniciar preparo' : 'Marcar como pronto' }}
      </button>
    </div>
  </article>
</template>
