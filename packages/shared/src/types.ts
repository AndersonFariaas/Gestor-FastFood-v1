import type { OrderStatus, PaymentMethod, Role } from './constants.ts';

// Contratos (DTOs) expostos pela API. Datas em ISO 8601 (UTC), valores em centavos.

export interface User {
  id: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  priceCents: number;
  category: string;
  description: string;
  active: boolean;
}

export interface OrderItem {
  productId: string | null;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  shiftId: string;
  number: number;
  status: OrderStatus;
  customer: string;
  note: string;
  paymentMethod: PaymentMethod;
  totalCents: number;
  items: OrderItem[];
  cancelReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  openedAt: string;
  closedAt: string | null;
}

export interface ShiftSummary {
  shift: Shift;
  /** Faturamento: soma dos pedidos entregues. */
  revenueCents: number;
  /** Valor dos pedidos ainda em andamento. */
  openCents: number;
  counts: Record<OrderStatus, number>;
  byPaymentMethod: Partial<Record<PaymentMethod, number>>;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  issues?: { path: string; message: string }[];
}

/** Eventos que o servidor envia em tempo real para as telas conectadas. */
export interface ServerToClientEvents {
  'order:created': (order: Order) => void;
  'order:updated': (order: Order) => void;
  'product:saved': (product: Product) => void;
  'product:deleted': (payload: { id: string }) => void;
  'shift:closed': (payload: { shiftId: string }) => void;
}
