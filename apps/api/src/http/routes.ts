import {
  ChangePasswordInput,
  CreateOrderInput,
  CreateUserInput,
  IdParam,
  LoginInput,
  OrdersQuery,
  ProductInput,
  UpdateOrderStatusInput,
  UpdateUserInput,
} from '@fastfood/shared';
import { Router, type CookieOptions } from 'express';
import type { Services } from '../container.ts';
import { forbidden } from '../lib/errors.ts';
import {
  authenticate,
  currentSession,
  currentUser,
  requireRole,
  SESSION_COOKIE,
  sessionToken,
} from './middleware.ts';

interface RouteDeps {
  services: Services;
  sessionTtlMs: number;
  cookieSecure: boolean;
}

/** Rotas públicas e de sessão: `/api/auth/*`. */
export function authRoutes({ services, sessionTtlMs, cookieSecure }: RouteDeps): Router {
  const { auth } = services;
  const router = Router();
  const cookie: CookieOptions = { httpOnly: true, sameSite: 'strict', secure: cookieSecure, path: '/' };
  const withPendingPassword = authenticate(auth, { allowPendingPassword: true });

  router.post('/login', async (req, res) => {
    const { token, user } = await auth.login(LoginInput.parse(req.body), req.ip ?? 'unknown');
    res.cookie(SESSION_COOKIE, token, { ...cookie, maxAge: sessionTtlMs }).json({ user });
  });

  router.post('/logout', (req, res) => {
    const session = auth.resolve(sessionToken(req));
    if (session) auth.logout(session.tokenHash);
    res.clearCookie(SESSION_COOKIE, cookie).status(204).end();
  });

  router.get('/me', withPendingPassword, (req, res) => {
    res.json({ user: currentUser(req) });
  });

  router.post('/change-password', withPendingPassword, async (req, res) => {
    const user = await auth.changePassword(currentSession(req), ChangePasswordInput.parse(req.body));
    res.json({ user });
  });

  return router;
}

/** Rotas de negócio: todas exigem sessão válida (aplicado em `app.ts`). */
export function apiRoutes({ services }: RouteDeps): Router {
  const { products, orders, shifts, users } = services;
  const router = Router();
  const adminOnly = requireRole('admin');
  const id = (value: unknown) => IdParam.parse(value);

  // Cardápio
  router.get('/products', (_req, res) => {
    res.json(products.list());
  });
  router.post('/products', adminOnly, (req, res) => {
    res.status(201).json(products.create(ProductInput.parse(req.body)));
  });
  router.put('/products/:id', adminOnly, (req, res) => {
    res.json(products.update(id(req.params.id), ProductInput.parse(req.body)));
  });
  router.delete('/products/:id', adminOnly, (req, res) => {
    products.remove(id(req.params.id));
    res.status(204).end();
  });

  // Pedidos (do turno atual, ou de um turno anterior para a gerência)
  router.get('/orders', (req, res) => {
    const { shiftId } = OrdersQuery.parse(req.query);
    if (shiftId && currentUser(req).role !== 'admin') throw forbidden();
    res.json(orders.list(shiftId));
  });
  router.post('/orders', (req, res) => {
    res.status(201).json(orders.create(CreateOrderInput.parse(req.body), currentUser(req)));
  });
  router.patch('/orders/:id/status', (req, res) => {
    res.json(
      orders.updateStatus(id(req.params.id), UpdateOrderStatusInput.parse(req.body), currentUser(req)),
    );
  });

  // Turnos de caixa
  router.get('/shifts/current', adminOnly, (_req, res) => {
    res.json(shifts.currentSummary());
  });
  router.get('/shifts', adminOnly, (_req, res) => {
    res.json(shifts.history());
  });
  router.post('/shifts/current/close', adminOnly, (req, res) => {
    res.json(shifts.close(currentUser(req)));
  });

  // Usuários
  router.get('/users', adminOnly, (_req, res) => {
    res.json(users.list());
  });
  router.post('/users', adminOnly, async (req, res) => {
    res.status(201).json(await users.create(CreateUserInput.parse(req.body)));
  });
  router.patch('/users/:id', adminOnly, async (req, res) => {
    res.json(await users.update(id(req.params.id), UpdateUserInput.parse(req.body), currentUser(req)));
  });
  router.delete('/users/:id', adminOnly, (req, res) => {
    users.remove(id(req.params.id), currentUser(req));
    res.status(204).end();
  });

  return router;
}
