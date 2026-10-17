import type { Order } from '@fastfood/shared';
import { describe, expect, it } from 'vitest';
import { buildReceiptHtml } from './receipt';

const order = (over: Partial<Order> = {}): Order => ({
  id: 'o1',
  shiftId: 's1',
  number: 42,
  status: 'NOVO',
  customer: 'Joana',
  note: '',
  paymentMethod: 'DINHEIRO',
  totalCents: 9060,
  items: [
    { productId: 'p1', name: 'Big Burger', unitPriceCents: 3290, quantity: 2 },
    { productId: 'p2', name: 'Batata Frita G', unitPriceCents: 1590, quantity: 1 },
  ],
  cancelReason: null,
  createdBy: 'u1',
  createdAt: '2026-10-17T18:00:00.000Z',
  updatedAt: '2026-10-17T18:00:00.000Z',
  ...over,
});

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('comprovante do pedido', () => {
  it('traz número do pedido, itens, total e troco', () => {
    const t = text(buildReceiptHtml(order(), { receivedCents: 10000, changeCents: 940 }));
    expect(t).toContain('SENHA 42');
    expect(t).toMatch(/2x Big Burger/);
    expect(t).toMatch(/R\$\s65,80/);
    expect(t).toMatch(/TOTAL R\$\s90,60/);
    expect(t).toMatch(/Valor recebido R\$\s100,00/);
    expect(t).toMatch(/TROCO R\$\s9,40/);
    expect(t).toContain('Não é documento fiscal');
  });

  it('omite troco quando o pagamento não é em dinheiro', () => {
    const t = text(buildReceiptHtml(order({ paymentMethod: 'PIX' })));
    expect(t).toContain('Pagamento PIX');
    expect(t).not.toContain('TROCO');
  });

  it('escapa dados digitados pelo usuário', () => {
    const html = buildReceiptHtml(order({ customer: '<img src=x onerror=alert(1)>', note: '<b>x</b>' }));
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
