<script setup lang="ts">
import {
  formatCents,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type SelectablePaymentMethod,
} from '@fastfood/shared';
import {
  PhCreditCard,
  PhMinus,
  PhMoney,
  PhPaperPlaneRight,
  PhPixLogo,
  PhPlus,
  PhReceipt,
  PhShoppingCart,
  PhTicket,
} from '@phosphor-icons/vue';
import { ref } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useSettings } from '@/composables/useSettings';
import { useToast } from '@/composables/useToast';
import { errorMessage } from '@/services/http';
import { useCartStore } from '@/stores/cart';
import { useOrdersStore } from '@/stores/orders';
import { printReceipt } from '@/utils/receipt';

const cart = useCartStore();
const orders = useOrdersStore();
const settings = useSettings();
const toast = useToast();
const sending = ref(false);

const PAYMENT_ICONS: Record<SelectablePaymentMethod, typeof PhMoney> = {
  CREDITO: PhCreditCard,
  DEBITO: PhCreditCard,
  PIX: PhPixLogo,
  DINHEIRO: PhMoney,
  VALE: PhTicket,
};

async function submit() {
  if (!cart.canSubmit || sending.value) return;
  sending.value = true;
  try {
    const order = await orders.create(cart.toOrderInput());
    cart.clear();
    toast.success(`Pedido #${order.number} enviado para a cozinha!`);
    if (settings.value.autoPrint && !printReceipt(order)) {
      toast.error('O navegador bloqueou a janela de impressão. Libere pop-ups para este site.');
    }
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <aside class="flex min-h-0 flex-col border-gray-200 bg-white lg:border-l" aria-label="Pedido atual">
    <div class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
      <h2 class="flex items-center gap-2 font-bold text-gray-800">
        <PhShoppingCart class="size-5" aria-hidden="true" /> Pedido atual
        <span v-if="cart.itemCount" class="text-sm font-normal text-gray-500"
          >({{ cart.itemCount }} itens)</span
        >
      </h2>
      <button
        v-if="!cart.isEmpty"
        type="button"
        class="text-sm font-medium text-red-500 hover:text-red-700"
        @click="cart.clear()"
      >
        Limpar
      </button>
    </div>

    <div class="min-h-40 flex-1 space-y-3 overflow-y-auto p-5">
      <div v-if="cart.isEmpty" class="flex h-full flex-col items-center justify-center text-gray-400">
        <PhReceipt class="mb-3 size-12" aria-hidden="true" />
        <p>Nenhum item adicionado.</p>
      </div>
      <div
        v-for="line in cart.lines"
        :key="line.productId"
        class="rounded-xl border border-gray-100 p-3 shadow-sm"
      >
        <div class="mb-2 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-gray-800">{{ line.name }}</p>
            <p class="text-xs text-gray-500">{{ formatCents(line.unitPriceCents) }} cada</p>
          </div>
          <p class="font-semibold text-gray-900 tabular-nums">
            {{ formatCents(line.unitPriceCents * line.quantity) }}
          </p>
        </div>
        <div class="inline-flex items-center rounded-lg bg-gray-50 p-1">
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm hover:text-brand-600"
            :aria-label="`Remover uma unidade de ${line.name}`"
            @click="cart.changeQuantity(line.productId, -1)"
          >
            <PhMinus class="size-4" />
          </button>
          <span class="w-9 text-center text-sm font-bold tabular-nums">{{ line.quantity }}</span>
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm hover:text-brand-600"
            :aria-label="`Adicionar uma unidade de ${line.name}`"
            @click="cart.changeQuantity(line.productId, 1)"
          >
            <PhPlus class="size-4" />
          </button>
        </div>
      </div>
    </div>

    <form class="space-y-3 border-t border-gray-200 bg-gray-50 p-5" @submit.prevent="submit">
      <input
        v-model="cart.customer"
        class="input"
        placeholder="Cliente / mesa (opcional)"
        maxlength="60"
        aria-label="Cliente ou mesa"
        autocomplete="off"
      />
      <input
        v-model="cart.note"
        class="input"
        placeholder="Observação (ex.: sem cebola)"
        maxlength="200"
        aria-label="Observação"
        autocomplete="off"
      />

      <fieldset>
        <legend class="label">Forma de pagamento</legend>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          <label
            v-for="method in PAYMENT_METHODS"
            :key="method"
            class="flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors"
            :class="
              cart.paymentMethod === method
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            "
          >
            <input v-model="cart.paymentMethod" type="radio" name="payment" :value="method" class="sr-only" />
            <component :is="PAYMENT_ICONS[method]" class="size-4 shrink-0" aria-hidden="true" />
            <span class="leading-tight">{{ PAYMENT_METHOD_LABELS[method] }}</span>
          </label>
        </div>
      </fieldset>

      <div class="flex items-center justify-between pt-1">
        <span class="font-medium text-gray-600">Total</span>
        <strong class="text-2xl font-bold text-gray-900 tabular-nums">{{
          formatCents(cart.totalCents)
        }}</strong>
      </div>

      <BaseButton type="submit" size="lg" block :loading="sending" :disabled="!cart.canSubmit">
        <PhPaperPlaneRight class="size-5" aria-hidden="true" />
        {{ !cart.isEmpty && !cart.paymentMethod ? 'Escolha o pagamento' : 'Enviar pedido' }}
      </BaseButton>
    </form>
  </aside>
</template>
