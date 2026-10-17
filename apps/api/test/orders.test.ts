import type { Order, ShiftSummary } from '@fastfood/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from './helpers.ts';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

const newOrder = (productId: string, quantity = 1, extra: Record<string, unknown> = {}) => ({
  items: [{ productId, quantity }],
  paymentMethod: 'PIX',
  ...extra,
});

describe('pedidos', () => {
  it('servidor calcula preço, total e número; ignora campos forjados', async () => {
    const burger = await ctx.createProduct({ name: 'X-Burger', priceCents: 2550 });
    const coca = await ctx.createProduct({ name: 'Coca', priceCents: 700, category: 'Bebidas' });

    const res = await ctx.operator.agent
      .post('/api/orders')
      .send({
        items: [
          { productId: burger.id, quantity: 2, priceCents: 0 },
          { productId: coca.id, quantity: 1 },
          { productId: burger.id, quantity: 1 },
        ],
        customer: '<img src=x onerror=alert(1)>',
        paymentMethod: 'DINHEIRO',
        totalCents: 0,
        number: 999,
        status: 'ENTREGUE',
      })
      .expect(201);

    const order = res.body as Order;
    expect(order.totalCents).toBe(2550 * 3 + 700);
    expect(order.status).toBe('NOVO');
    expect(order.items.find((i) => i.productId === burger.id)?.quantity).toBe(3);
    expect(order.customer).toBe('<img src=x onerror=alert(1)>'); // guardado como texto; o front escapa

    const next = await ctx.operator.agent.post('/api/orders').send(newOrder(coca.id)).expect(201);
    expect(next.body.number).toBe(order.number + 1);
    expect(next.body.customer).toBe('Balcão');
  });

  it('mantém o preço da venda mesmo se o cardápio mudar depois', async () => {
    const p = await ctx.createProduct({ name: 'Suco', priceCents: 900 });
    const order = (await ctx.operator.agent.post('/api/orders').send(newOrder(p.id, 2)).expect(201))
      .body as Order;
    await ctx.admin.agent
      .put(`/api/products/${p.id}`)
      .send({ name: 'Suco', priceCents: 1500, category: 'Lanches' })
      .expect(200);
    const list = (await ctx.operator.agent.get('/api/orders').expect(200)).body as Order[];
    expect(list.find((o) => o.id === order.id)?.totalCents).toBe(1800);
  });

  it('recusa produto inativo, removido ou inexistente e dados inválidos', async () => {
    const off = await ctx.createProduct({ name: 'Off', active: false });
    const gone = await ctx.createProduct({ name: 'Gone' });
    await ctx.admin.agent.delete(`/api/products/${gone.id}`).expect(204);

    for (const id of [off.id, gone.id, 'nao-existe']) {
      const res = await ctx.operator.agent.post('/api/orders').send(newOrder(id)).expect(409);
      expect(res.body.code).toBe('PRODUCT_UNAVAILABLE');
    }
    const p = await ctx.createProduct();
    await ctx.operator.agent.post('/api/orders').send(newOrder(p.id, 1.5)).expect(400);
    await ctx.operator.agent
      .post('/api/orders')
      .send(newOrder(p.id, 1, { paymentMethod: 'BITCOIN' }))
      .expect(400);
    await ctx.operator.agent.post('/api/orders').send({ items: [] }).expect(400);
    await ctx.operator.agent.post('/api/orders').send('lixo').expect(400);
  });

  it('pedidos simultâneos nunca repetem o número da senha', async () => {
    const p = await ctx.createProduct();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        (i % 2 ? ctx.operator.agent : ctx.admin.agent).post('/api/orders').send(newOrder(p.id)),
      ),
    );
    const numbers = results.map((r) => r.body.number as number);
    expect(new Set(numbers).size).toBe(20);
  });
});

describe('status do pedido', () => {
  it('segue o fluxo NOVO → EM_PREPARO → PRONTO → ENTREGUE', async () => {
    const p = await ctx.createProduct();
    const order = (await ctx.operator.agent.post('/api/orders').send(newOrder(p.id)).expect(201))
      .body as Order;
    const set = (status: string) =>
      ctx.operator.agent.patch(`/api/orders/${order.id}/status`).send({ status });

    expect((await set('PRONTO')).status).toBe(409);
    expect((await set('ARQUIVADO')).status).toBe(400);
    expect((await set('EM_PREPARO')).status).toBe(200);
    expect((await set('EM_PREPARO')).status).toBe(409);
    expect((await set('PRONTO')).status).toBe(200);
    expect((await set('ENTREGUE')).body.status).toBe('ENTREGUE');
  });

  it('cancelamento é exclusivo da gerência e exige motivo', async () => {
    const p = await ctx.createProduct();
    const order = (await ctx.operator.agent.post('/api/orders').send(newOrder(p.id)).expect(201))
      .body as Order;
    const url = `/api/orders/${order.id}/status`;

    await ctx.operator.agent.patch(url).send({ status: 'CANCELADO', reason: 'x' }).expect(403);
    await ctx.admin.agent.patch(url).send({ status: 'CANCELADO' }).expect(400);
    const res = await ctx.admin.agent
      .patch(url)
      .send({ status: 'CANCELADO', reason: 'Cliente desistiu' })
      .expect(200);
    expect(res.body.cancelReason).toBe('Cliente desistiu');
  });
});

describe('turno de caixa', () => {
  it('não fecha com pedidos em andamento; fecha e reinicia a numeração quando tudo foi resolvido', async () => {
    const before = (await ctx.admin.agent.get('/api/shifts/current').expect(200)).body as ShiftSummary;
    expect(before.counts.NOVO).toBeGreaterThan(0);
    const blocked = await ctx.admin.agent.post('/api/shifts/current/close').expect(409);
    expect(blocked.body.code).toBe('OPEN_ORDERS');

    // Resolve todos os pedidos em aberto
    const open = ((await ctx.admin.agent.get('/api/orders')).body as Order[]).filter((o) =>
      ['NOVO', 'EM_PREPARO', 'PRONTO'].includes(o.status),
    );
    for (const o of open) {
      await ctx.admin.agent
        .patch(`/api/orders/${o.id}/status`)
        .send({ status: 'CANCELADO', reason: 'teste' })
        .expect(200);
    }

    const delivered = before.revenueCents;
    const closed = (await ctx.admin.agent.post('/api/shifts/current/close').expect(200)).body as ShiftSummary;
    expect(closed.shift.closedAt).not.toBeNull();
    expect(closed.revenueCents).toBe(delivered);
    expect(closed.byPaymentMethod.PIX).toBe(delivered);

    // Novo turno: lista vazia e numeração reinicia
    expect((await ctx.operator.agent.get('/api/orders')).body).toEqual([]);
    const p = await ctx.createProduct();
    const first = await ctx.operator.agent.post('/api/orders').send(newOrder(p.id)).expect(201);
    expect(first.body.number).toBe(1);

    // Histórico do turno anterior continua acessível para a gerência
    const history = (await ctx.admin.agent.get('/api/shifts').expect(200)).body as ShiftSummary[];
    expect(history[0]?.shift.id).toBe(closed.shift.id);
    await ctx.admin.agent.get(`/api/orders?shiftId=${closed.shift.id}`).expect(200);
    await ctx.operator.agent.get(`/api/orders?shiftId=${closed.shift.id}`).expect(403);
  });
});
