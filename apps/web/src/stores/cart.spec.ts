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
    expect(cart.quantityOf('p1')).toBe(2);
    expect(cart.totalCents).toBe(2550 * 2 + 700);
  });

  it('remove o item quando a quantidade chega a zero', () => {
    const cart = useCartStore();
    cart.add(product());
    cart.changeQuantity('p1', -1);
    expect(cart.isEmpty).toBe(true);
  });

  it('exige forma de pagamento e explica o que falta', () => {
    const cart = useCartStore();
    expect(cart.blocker).toBe('Adicione itens ao pedido');
    cart.add(product());
    expect(cart.canSubmit).toBe(false);
    expect(cart.blocker).toBe('Escolha a forma de pagamento');
    expect(() => cart.toOrderInput()).toThrow();

    cart.setPaymentMethod('PIX');
    expect(cart.canSubmit).toBe(true);
    expect(cart.toOrderInput()).toEqual({
      items: [{ productId: 'p1', quantity: 1 }],
      customer: '',
      note: '',
      paymentMethod: 'PIX',
    });
  });

  it('calcula o troco no dinheiro e bloqueia valor recebido insuficiente', () => {
    const cart = useCartStore();
    cart.add(product()); // R$ 25,50
    cart.setPaymentMethod('DINHEIRO');
    expect(cart.changeCents).toBeNull(); // sem valor informado, não bloqueia

    cart.cashReceivedCents = 2000;
    expect(cart.cashIsShort).toBe(true);
    expect(cart.canSubmit).toBe(false);

    cart.cashReceivedCents = 5000;
    expect(cart.changeCents).toBe(2450);
    expect(cart.canSubmit).toBe(true);

    // Trocar a forma de pagamento descarta o valor recebido.
    cart.setPaymentMethod('CARTAO');
    expect(cart.cashReceivedCents).toBeNull();
    expect(cart.changeCents).toBeNull();
  });

  it('acompanha mudanças do cardápio: atualiza preço e remove itens indisponíveis', () => {
    const cart = useCartStore();
    cart.add(product());
    cart.add(product({ id: 'p2' }));
    cart.syncWithCatalog([product({ priceCents: 3000 })]);
    expect(cart.lines).toEqual([
      { productId: 'p1', name: 'X-Burger', category: 'Lanches', unitPriceCents: 3000, quantity: 1 },
    ]);
  });
});
