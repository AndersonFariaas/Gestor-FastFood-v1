import type { Database } from './db/database.ts';
import type { EventBus } from './lib/events.ts';
import { createAuthService } from './modules/auth/auth.service.ts';
import { createSessionsRepository } from './modules/auth/sessions.repository.ts';
import { createOrdersRepository } from './modules/orders/orders.repository.ts';
import { createOrdersService } from './modules/orders/orders.service.ts';
import { createProductsRepository } from './modules/products/products.repository.ts';
import { createProductsService } from './modules/products/products.service.ts';
import { createShiftsRepository } from './modules/shifts/shifts.repository.ts';
import { createShiftsService } from './modules/shifts/shifts.service.ts';
import { createUsersRepository } from './modules/users/users.repository.ts';
import { createUsersService } from './modules/users/users.service.ts';

/** Composição das dependências (injeção manual): facilita testar cada peça isoladamente. */
export function createServices({
  db,
  bus,
  sessionTtlMs,
}: {
  db: Database;
  bus: EventBus;
  sessionTtlMs: number;
}) {
  const usersRepo = createUsersRepository(db);
  const productsRepo = createProductsRepository(db);

  const auth = createAuthService({
    users: usersRepo,
    sessions: createSessionsRepository(db),
    bus,
    sessionTtlMs,
  });
  const shifts = createShiftsService({ db, shifts: createShiftsRepository(db), bus });

  return {
    auth,
    shifts,
    users: createUsersService({ db, users: usersRepo, auth }),
    products: createProductsService({ products: productsRepo, bus }),
    orders: createOrdersService({
      db,
      orders: createOrdersRepository(db),
      products: productsRepo,
      shifts,
      bus,
    }),
  };
}

export type Services = ReturnType<typeof createServices>;
