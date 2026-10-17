import type { Order } from '@fastfood/shared';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from './helpers.ts';

let ctx: TestContext;
const sockets: Socket[] = [];

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  sockets.forEach((s) => s.close());
  await ctx.close();
});

function open(cookie?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(ctx.url, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: cookie ? { cookie } : {},
    });
    sockets.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

describe('tempo real', () => {
  it('recusa conexão sem sessão válida', async () => {
    await expect(open()).rejects.toThrow('unauthorized');
    await expect(open('sid=forjado')).rejects.toThrow('unauthorized');
  });

  it('transmite pedidos criados para as telas conectadas', async () => {
    const kitchen = await open(ctx.admin.cookie);
    const received = new Promise<Order>((resolve) => kitchen.once('order:created', resolve));

    const p = await ctx.createProduct();
    await ctx.operator.agent
      .post('/api/orders')
      .send({ items: [{ productId: p.id, quantity: 1 }], paymentMethod: 'PIX' })
      .expect(201);
    expect((await received).items[0]?.productId).toBe(p.id);
  });

  it('logout derruba as conexões daquela sessão', async () => {
    const session = await ctx.agentFor('operador', 'operador-senha-123-nova');
    const socket = await open(session.cookie);
    const reason = new Promise((resolve) => socket.once('disconnect', resolve));
    await session.agent.post('/api/auth/logout').expect(204);
    expect(await reason).toBe('io server disconnect');
  });
});
