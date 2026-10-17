import type {
  ChangePasswordInput,
  CreateOrderInput,
  CreateUserInput,
  LoginInput,
  Order,
  Product,
  ProductInput,
  ShiftSummary,
  UpdateOrderStatusInput,
  UpdateUserInput,
  User,
} from '@fastfood/shared';
import { http } from './http';

/** Cliente tipado da API: um único lugar com as rotas e os contratos de cada chamada. */
export const api = {
  auth: {
    me: () => http<{ user: User }>('GET', '/auth/me'),
    login: (input: LoginInput) => http<{ user: User }>('POST', '/auth/login', input),
    logout: () => http<void>('POST', '/auth/logout'),
    changePassword: (input: ChangePasswordInput) =>
      http<{ user: User }>('POST', '/auth/change-password', input),
  },
  products: {
    list: () => http<Product[]>('GET', '/products'),
    create: (input: ProductInput) => http<Product>('POST', '/products', input),
    update: (id: string, input: ProductInput) =>
      http<Product>('PUT', `/products/${encodeURIComponent(id)}`, input),
    remove: (id: string) => http<void>('DELETE', `/products/${encodeURIComponent(id)}`),
  },
  orders: {
    list: (shiftId?: string) =>
      http<Order[]>('GET', shiftId ? `/orders?shiftId=${encodeURIComponent(shiftId)}` : '/orders'),
    create: (input: CreateOrderInput) => http<Order>('POST', '/orders', input),
    updateStatus: (id: string, input: UpdateOrderStatusInput) =>
      http<Order>('PATCH', `/orders/${encodeURIComponent(id)}/status`, input),
  },
  shifts: {
    current: () => http<ShiftSummary>('GET', '/shifts/current'),
    history: () => http<ShiftSummary[]>('GET', '/shifts'),
    closeCurrent: () => http<ShiftSummary>('POST', '/shifts/current/close'),
  },
  users: {
    list: () => http<User[]>('GET', '/users'),
    create: (input: CreateUserInput) => http<User>('POST', '/users', input),
    update: (id: string, input: UpdateUserInput) =>
      http<User>('PATCH', `/users/${encodeURIComponent(id)}`, input),
    remove: (id: string) => http<void>('DELETE', `/users/${encodeURIComponent(id)}`),
  },
};
