import type { CreateOrderInput, Product, SelectablePaymentMethod } from '@fastfood/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface CartLine {
  productId: string;
  name: string;
  category: string;
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
  /** Valor entregue pelo cliente (pagamento em dinheiro), para calcular o troco. */
  const cashReceivedCents = ref<number | null>(null);

  const totalCents = computed(() => lines.value.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0));
  const itemCount = computed(() => lines.value.reduce((s, l) => s + l.quantity, 0));
  const isEmpty = computed(() => lines.value.length === 0);

  const isCash = computed(() => paymentMethod.value === 'DINHEIRO');
  const changeCents = computed(() =>
    isCash.value && cashReceivedCents.value !== null ? cashReceivedCents.value - totalCents.value : null,
  );
  /** Valor recebido informado, mas menor que o total. */
  const cashIsShort = computed(() => changeCents.value !== null && changeCents.value < 0);

  /** O que falta para finalizar (exibido no botão), ou `null` se está tudo certo. */
  const blocker = computed(() => {
    if (isEmpty.value) return 'Adicione itens ao pedido';
    if (!paymentMethod.value) return 'Escolha a forma de pagamento';
    if (cashIsShort.value) return 'Valor recebido menor que o total';
    return null;
  });
  const canSubmit = computed(() => blocker.value === null);

  const quantityOf = (productId: string) => lines.value.find((l) => l.productId === productId)?.quantity ?? 0;

  function add(product: Product) {
    const line = lines.value.find((l) => l.productId === product.id);
    if (line) line.quantity = Math.min(line.quantity + 1, MAX_QUANTITY);
    else
      lines.value.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        unitPriceCents: product.priceCents,
        quantity: 1,
      });
  }

  function changeQuantity(productId: string, delta: number) {
    const line = lines.value.find((l) => l.productId === productId);
    if (!line) return;
    line.quantity = Math.min(line.quantity + delta, MAX_QUANTITY);
    if (line.quantity <= 0) remove(productId);
  }

  function remove(productId: string) {
    lines.value = lines.value.filter((l) => l.productId !== productId);
  }

  function setPaymentMethod(method: SelectablePaymentMethod) {
    paymentMethod.value = method;
    if (method !== 'DINHEIRO') cashReceivedCents.value = null;
  }

  /** Atualiza nomes/preços e remove itens que saíram do cardápio. */
  function syncWithCatalog(available: Product[]) {
    const byId = new Map(available.map((p) => [p.id, p]));
    lines.value = lines.value.flatMap((l) => {
      const p = byId.get(l.productId);
      return p ? [{ ...l, name: p.name, category: p.category, unitPriceCents: p.priceCents }] : [];
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
    cashReceivedCents.value = null;
  }

  return {
    lines,
    customer,
    note,
    paymentMethod,
    cashReceivedCents,
    totalCents,
    itemCount,
    isEmpty,
    isCash,
    changeCents,
    cashIsShort,
    blocker,
    canSubmit,
    quantityOf,
    add,
    changeQuantity,
    remove,
    setPaymentMethod,
    syncWithCatalog,
    toOrderInput,
    clear,
  };
});
