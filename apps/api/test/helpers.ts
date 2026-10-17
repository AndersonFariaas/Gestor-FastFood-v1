import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Product, User } from '@fastfood/shared';
import { pino } from 'pino';
import request from 'supertest';
import { createApp } from '../src/app.ts';
import { createServices } from '../src/container.ts';
import { openDatabase } from '../src/db/database.ts';
import { migrate } from '../src/db/migrate.ts';
import { createEventBus } from '../src/lib/events.ts';
import { attachRealtime } from '../src/realtime.ts';

export const ADMIN_PASSWORD = 'admin-senha-123';
export const OPERATOR_PASSWORD = 'operador-senha-123';

/** Sobe a aplicação completa com banco em memória numa porta aleatória. */
export async function createTestContext() {
  const db = openDatabase(':memory:');
  migrate(db);
  const bus = createEventBus();
  const services = createServices({ db, bus, sessionTtlMs: 60 * 60 * 1000 });
  await services.users.ensureInitialAdmin(ADMIN_PASSWORD);
  services.shifts.ensureOpenShift();

  const app = createApp({
    services,
    logger: pino({ level: 'silent' }),
    config: { sessionTtlMs: 60 * 60 * 1000, cookieSecure: false, webDist: null },
  });
  const server: Server = createServer(app);
  const io = attachRealtime(server, { auth: services.auth, bus });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  /** Cliente HTTP com cookie de sessão já autenticado (e senha provisória já trocada). */
  async function agentFor(username: string, password: string, newPassword = `${password}-nova`) {
    const agent = request.agent(server);
    const login = await agent.post('/api/auth/login').send({ username, password }).expect(200);
    const user = login.body.user as User;
    if (user.mustChangePassword) {
      await agent
        .post('/api/auth/change-password')
        .send({ currentPassword: password, newPassword })
        .expect(200);
    }
    const cookie = String(login.headers['set-cookie']?.[0] ?? '').split(';')[0]!;
    return { agent, cookie, user };
  }

  const admin = await agentFor('admin', ADMIN_PASSWORD);
  await admin.agent
    .post('/api/users')
    .send({ username: 'operador', password: OPERATOR_PASSWORD, role: 'operator' })
    .expect(201);
  const operator = await agentFor('operador', OPERATOR_PASSWORD);

  async function createProduct(data: Partial<Product> = {}): Promise<Product> {
    const res = await admin.agent
      .post('/api/products')
      .send({ name: 'X-Burger', priceCents: 2550, category: 'Lanches', ...data })
      .expect(201);
    return res.body as Product;
  }

  async function close() {
    await io.close();
    server.close();
    db.close();
  }

  return { db, services, server, url, admin, operator, agentFor, createProduct, close };
}

export type TestContext = Awaited<ReturnType<typeof createTestContext>>;
