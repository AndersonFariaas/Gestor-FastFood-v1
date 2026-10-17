import type { CreateOrderInput, Product, SelectablePaymentMethod } from '@fastfood/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface CartLine {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

const MAX_QUANTITY = 99;

/** Carrinho do caixa. Os preços aqui são só para exibição: o total oficial é calculado pela API. */
export const useCartStore = defineStore('cart', () => {
  const lines = ref<CartLine[]>([]);
  const customer = ref('');
  const note = ref('');
  const paymentMethod = ref<SelectablePaymentMethod | null>(null);

  const totalCents = computed(() => lines.value.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0));
  const itemCount = computed(() => lines.value.reduce((s, l) => s + l.quantity, 0));
  const isEmpty = computed(() => lines.value.length === 0);
  const canSubmit = computed(() => !isEmpty.value && paymentMethod.value !== null);

  function add(product: Product) {
    const line = lines.value.find((l) => l.productId === product.id);
    if (line) line.quantity = Math.min(line.quantity + 1, MAX_QUANTITY);
    else
      lines.value.push({
        productId: product.id,
        name: product.name,
        unitPriceCents: product.priceCents,
        quantity: 1,
      });
  }

  function changeQuantity(productId: string, delta: number) {
    const line = lines.value.find((l) => l.productId === productId);
    if (!line) return;
    line.quantity = Math.min(line.quantity + delta, MAX_QUANTITY);
    if (line.quantity <= 0) lines.value = lines.value.filter((l) => l !== line);
  }

  /** Atualiza nomes/preços e remove itens que saíram do cardápio. */
  function syncWithCatalog(available: Product[]) {
    const byId = new Map(available.map((p) => [p.id, p]));
    lines.value = lines.value.flatMap((l) => {
      const p = byId.get(l.productId);
      return p ? [{ ...l, name: p.name, unitPriceCents: p.priceCents }] : [];
    });
  }

  function toOrderInput(): CreateOrderInput {
    if (!paymentMethod.value) throw new Error('Selecione a forma de pagamento.');
    return {
      items: lines.value.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      customer: customer.value.trim(),
      note: note.value.trim(),
      paymentMethod: paymentMethod.value,
    };
  }

  function clear() {
    lines.value = [];
    customer.value = '';
    note.value = '';
    paymentMethod.value = null;
  }

  return {
    lines,
    customer,
    note,
    paymentMethod,
    totalCents,
    itemCount,
    isEmpty,
    canSubmit,
    add,
    changeQuantity,
    syncWithCatalog,
    toOrderInput,
    clear,
  };
});
