<script setup lang="ts">
import { formatCents, PAYMENT_METHOD_LABELS } from '@fastfood/shared';
import { PhCheckCircle, PhPrinter } from '@phosphor-icons/vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import type { SentOrder } from './types';

defineProps<{ result: SentOrder | null }>();
const emit = defineEmits<{ close: []; print: [result: SentOrder] }>();
</script>

<template>
  <BaseModal :open="result !== null" title="Pedido enviado" size="sm" hide-header @close="emit('close')">
    <div v-if="result" class="pt-4 text-center">
      <div
        class="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
      >
        <PhCheckCircle class="size-9" weight="fill" aria-hidden="true" />
      </div>
      <p class="font-display text-lg font-semibold text-stone-700">Pedido enviado para a cozinha</p>

      <div class="my-5 rounded-3xl bg-brand-600 px-6 py-5 text-white shadow-lg shadow-brand-900/25">
        <p class="text-xs font-semibold tracking-[0.25em] text-brand-100 uppercase">Senha</p>
        <p class="font-display text-7xl leading-none font-black text-accent-400 tabular-nums">
          {{ result.order.number }}
        </p>
        <p class="mt-2 truncate text-lg font-semibold">{{ result.order.customer }}</p>
      </div>

      <dl class="space-y-2 text-left text-sm">
        <div class="flex justify-between">
          <dt class="text-stone-500">Total</dt>
          <dd class="font-display font-bold text-stone-900 tabular-nums">
            {{ formatCents(result.order.totalCents) }}
          </dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-stone-500">Pagamento</dt>
          <dd class="font-semibold text-stone-800">
            {{ PAYMENT_METHOD_LABELS[result.order.paymentMethod] }}
          </dd>
        </div>
        <div
          v-if="result.changeCents !== null"
          class="flex justify-between rounded-xl bg-emerald-50 px-3 py-2"
        >
          <dt class="font-semibold text-emerald-800">Troco</dt>
          <dd class="font-display text-lg font-bold text-emerald-800 tabular-nums">
            {{ formatCents(result.changeCents) }}
          </dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <div class="grid w-full grid-cols-2 gap-3">
        <BaseButton variant="secondary" size="lg" @click="result && emit('print', result)">
          <PhPrinter class="size-5" aria-hidden="true" /> Imprimir
        </BaseButton>
        <BaseButton size="lg" autofocus @click="emit('close')">Novo pedido</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
