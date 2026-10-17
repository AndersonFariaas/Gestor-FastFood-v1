import type { Product } from '@fastfood/shared';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cart';

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'X-Burger',
  priceCents: 2550,
  category: 'Lanches',
  description: '',
  active: true,
  ...over,
});

describe('cart store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('soma quantidades do mesmo produto e calcula o total em centavos', () => {
    const cart = useCartStore();
    cart.add(product());
    cart.add(product());
    cart.add(product({ id: 'p2', priceCents: 700 }));
    expect(cart.lines).toHaveLength(2);
    expect(cart.itemCount).toBe(3);
    expect(cart.totalCents).toBe(2550 * 2 + 700);
  });

  it('remove o item quando a quantidade chega a zero', () => {
    const cart = useCartStore();
    cart.add(product());
    cart.changeQuantity('p1', -1);
    expect(cart.isEmpty).toBe(true);
  });

  it('exige forma de pagamento para enviar', () => {
    const cart = useCartStore();
    cart.add(product());
    expect(cart.canSubmit).toBe(false);
    expect(() => cart.toOrderInput()).toThrow();
    cart.paymentMethod = 'PIX';
    expect(cart.toOrderInput()).toEqual({
      items: [{ productId: 'p1', quantity: 1 }],
      customer: '',
      note: '',
      paymentMethod: 'PIX',
    });
  });

  it('acompanha mudanças do cardápio: atualiza preço e remove itens indisponíveis', () => {
    const cart = useCartStore();
    cart.add(product());
    cart.add(product({ id: 'p2' }));
    cart.syncWithCatalog([product({ priceCents: 3000 })]);
    expect(cart.lines).toEqual([{ productId: 'p1', name: 'X-Burger', unitPriceCents: 3000, quantity: 1 }]);
  });
});
