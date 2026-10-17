<script setup lang="ts">
import { formatCents, fromCents, toCents } from '@fastfood/shared';
import { computed, ref, watch } from 'vue';

const props = defineProps<{ totalCents: number }>();
const received = defineModel<number | null>({ required: true });

const BILLS = [2000, 5000, 10000, 20000];

const text = ref(received.value === null ? '' : fromCents(received.value).toFixed(2).replace('.', ','));

// Mantém o campo coerente quando o valor muda por fora (atalhos ou carrinho limpo).
watch(received, (value) => {
  const parsed = parse(text.value);
  if (value !== parsed) text.value = value === null ? '' : fromCents(value).toFixed(2).replace('.', ',');
});

function parse(value: string): number | null {
  const n = Number(value.replace(/\./g, '').replace(',', '.'));
  return value.trim() && Number.isFinite(n) && n >= 0 ? toCents(n) : null;
}

function onInput(value: string) {
  text.value = value;
  received.value = parse(value);
}

/** Notas que fazem sentido como atalho: só as que cobrem o total. */
const shortcuts = computed(() => BILLS.filter((b) => b >= props.totalCents).slice(0, 3));
const change = computed(() => (received.value === null ? null : received.value - props.totalCents));
</script>

<template>
  <div class="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
    <label
      class="mb-1.5 block text-xs font-semibold tracking-wide text-stone-500 uppercase"
      for="cash-received"
    >
      Valor recebido
    </label>
    <div class="flex gap-2">
      <div class="relative flex-1">
        <span class="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-stone-400">R$</span>
        <input
          id="cash-received"
          :value="text"
          class="input pl-10 font-display text-base font-semibold tabular-nums"
          inputmode="decimal"
          placeholder="0,00"
          autocomplete="off"
          @input="onInput(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div class="mt-2 flex flex-wrap gap-1.5">
      <button
        type="button"
        class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-accent-100 hover:ring-accent-300"
        @click="received = totalCents"
      >
        Valor exato
      </button>
      <button
        v-for="bill in shortcuts"
        :key="bill"
        type="button"
        class="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-accent-100 hover:ring-accent-300"
        @click="received = bill"
      >
        {{ formatCents(bill) }}
      </button>
    </div>
    <p
      v-if="change !== null"
      class="mt-3 flex items-center justify-between rounded-xl px-3 py-2 font-semibold"
      :class="change >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-brand-50 text-brand-700'"
      role="status"
    >
      <span>{{ change >= 0 ? 'Troco' : 'Faltam' }}</span>
      <span class="font-display text-xl tabular-nums">{{ formatCents(Math.abs(change)) }}</span>
    </p>
  </div>
</template>
