<script setup lang="ts">
import { formatCents } from '@fastfood/shared';
import { PhMinus, PhNotePencil, PhPlus, PhShoppingBagOpen, PhTrash, PhUser, PhX } from '@phosphor-icons/vue';
import { ref } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useToast } from '@/composables/useToast';
import { errorMessage } from '@/services/http';
import { useCartStore } from '@/stores/cart';
import { useOrdersStore } from '@/stores/orders';
import { categoryVisual } from '@/utils/visuals';
import CashChange from './CashChange.vue';
import PaymentSelector from './PaymentSelector.vue';
import type { SentOrder } from './types';

defineProps<{ closable?: boolean }>();
const emit = defineEmits<{ sent: [result: SentOrder]; close: [] }>();

const cart = useCartStore();
const orders = useOrdersStore();
const toast = useToast();
const sending = ref(false);

async function submit() {
  if (!cart.canSubmit || sending.value) return;
  sending.value = true;
  try {
    const receivedCents = cart.isCash ? cart.cashReceivedCents : null;
    const changeCents = cart.changeCents;
    const order = await orders.create(cart.toOrderInput());
    cart.clear();
    emit('sent', { order, receivedCents, changeCents });
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <header class="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
      <h2 class="flex items-center gap-2 font-display text-xl font-bold text-stone-900">
        Pedido
        <span
          v-if="cart.itemCount"
          class="rounded-full bg-brand-600 px-2 py-0.5 font-sans text-xs font-bold text-white tabular-nums"
        >
          {{ cart.itemCount }}
        </span>
      </h2>
      <div class="flex items-center gap-1">
        <BaseButton v-if="!cart.isEmpty" variant="ghost" size="sm" @click="cart.clear()">
          <PhTrash class="size-4" aria-hidden="true" /> Limpar
        </BaseButton>
        <button
          v-if="closable"
          type="button"
          class="rounded-full p-2 text-stone-500 hover:bg-stone-100"
          aria-label="Fechar pedido"
          @click="emit('close')"
        >
          <PhX class="size-5" weight="bold" />
        </button>
      </div>
    </header>

    <!-- Itens -->
    <div class="min-h-32 flex-1 overflow-y-auto px-5 py-3">
      <div v-if="cart.isEmpty" class="flex h-full flex-col items-center justify-center py-8 text-center">
        <div class="mb-3 flex size-16 items-center justify-center rounded-full bg-accent-100 text-accent-600">
          <PhShoppingBagOpen class="size-8" weight="duotone" aria-hidden="true" />
        </div>
        <p class="font-display font-semibold text-stone-800">Pedido vazio</p>
        <p class="mt-1 text-sm text-stone-500">Toque nos produtos para adicionar.</p>
      </div>

      <TransitionGroup
        tag="ul"
        class="divide-y divide-stone-100"
        enter-from-class="opacity-0 -translate-x-2"
        enter-active-class="transition duration-200"
        leave-to-class="opacity-0"
        leave-active-class="transition duration-150"
      >
        <li v-for="line in cart.lines" :key="line.productId" class="flex items-center gap-3 py-3">
          <span
            class="flex size-11 shrink-0 items-center justify-center rounded-xl"
            :class="categoryVisual(line.category).tile"
            aria-hidden="true"
          >
            <component
              :is="categoryVisual(line.category).icon"
              class="size-6"
              :class="categoryVisual(line.category).iconClass"
              weight="duotone"
            />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-stone-900">{{ line.name }}</p>
            <p class="font-display text-sm font-semibold text-stone-500 tabular-nums">
              {{ formatCents(line.unitPriceCents * line.quantity) }}
            </p>
          </div>
          <div class="flex items-center rounded-full bg-stone-100 p-1">
            <button
              type="button"
              class="flex size-8 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm transition hover:text-brand-600"
              :aria-label="line.quantity === 1 ? `Remover ${line.name}` : `Diminuir ${line.name}`"
              @click="cart.changeQuantity(line.productId, -1)"
            >
              <component :is="line.quantity === 1 ? PhTrash : PhMinus" class="size-4" weight="bold" />
            </button>
            <span class="w-8 text-center font-display font-bold tabular-nums" aria-live="polite">{{
              line.quantity
            }}</span>
            <button
              type="button"
              class="flex size-8 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm transition hover:text-brand-600"
              :aria-label="`Aumentar ${line.name}`"
              @click="cart.changeQuantity(line.productId, 1)"
            >
              <PhPlus class="size-4" weight="bold" />
            </button>
          </div>
        </li>
      </TransitionGroup>
    </div>

    <!-- Fechamento do pedido -->
    <form class="space-y-4 border-t border-stone-100 bg-white px-5 pt-4 pb-5" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div class="relative">
          <PhUser class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            v-model="cart.customer"
            class="input pl-9"
            placeholder="Nome do cliente"
            maxlength="60"
            aria-label="Nome do cliente ou mesa"
            autocomplete="off"
          />
        </div>
        <div class="relative">
          <PhNotePencil
            class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            v-model="cart.note"
            class="input pl-9"
            placeholder="Observação"
            maxlength="200"
            aria-label="Observação para a cozinha"
            autocomplete="off"
          />
        </div>
      </div>

      <PaymentSelector :model-value="cart.paymentMethod" @update:model-value="cart.setPaymentMethod" />
      <CashChange
        v-if="cart.isCash && !cart.isEmpty"
        v-model="cart.cashReceivedCents"
        :total-cents="cart.totalCents"
      />

      <div class="flex items-end justify-between">
        <span class="text-sm font-semibold text-stone-500">Total</span>
        <span class="font-display text-3xl font-bold text-stone-900 tabular-nums">{{
          formatCents(cart.totalCents)
        }}</span>
      </div>

      <BaseButton type="submit" size="xl" block :loading="sending" :disabled="!cart.canSubmit">
        {{ cart.blocker ?? 'Finalizar pedido' }}
      </BaseButton>
    </form>
  </div>
</template>
