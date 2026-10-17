import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_METHODS, ROLES } from './constants.ts';

const text = (max: number) => z.string().trim().max(max);
const password = z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(200);

export const IdParam = z.string().min(1).max(64);

export const LoginInput = z.object({
  username: text(40).min(1),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: password,
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;

export const ProductInput = z.object({
  name: text(80).min(1),
  priceCents: z.number().int().min(0).max(10_000_000),
  category: text(40).min(1),
  description: text(200).default(''),
  active: z.boolean().default(true),
});
export type ProductInput = z.input<typeof ProductInput>;

// O cliente informa apenas O QUE quer; preço, total, número e horário são definidos pelo servidor.
export const CreateOrderInput = z.object({
  items: z
    .array(
      z.object({
        productId: IdParam,
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  customer: text(60).default(''),
  note: text(200).default(''),
  paymentMethod: z.enum(PAYMENT_METHODS),
});
export type CreateOrderInput = z.input<typeof CreateOrderInput>;

export const UpdateOrderStatusInput = z.object({
  status: z.enum(ORDER_STATUSES),
  reason: text(200).optional(),
});
export type UpdateOrderStatusInput = z.input<typeof UpdateOrderStatusInput>;

export const CreateUserInput = z.object({
  username: text(40)
    .min(3)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen ou sublinhado.'),
  password,
  role: z.enum(ROLES),
});
export type CreateUserInput = z.infer<typeof CreateUserInput>;

export const UpdateUserInput = z
  .object({
    role: z.enum(ROLES).optional(),
    password: password.optional(),
  })
  .refine((v) => v.role !== undefined || v.password !== undefined, 'Nada para atualizar.');
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;

export const OrdersQuery = z.object({
  shiftId: IdParam.optional(),
});
