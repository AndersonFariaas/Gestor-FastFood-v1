export const ROLES = ['admin', 'operator'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Gerente',
  operator: 'Operador',
};

export const ORDER_STATUSES = ['NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NOVO: 'Novo',
  EM_PREPARO: 'Em preparo',
  PRONTO: 'Pronto',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

/** Próximos status permitidos a partir de cada status. */
export const STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NOVO: ['EM_PREPARO', 'CANCELADO'],
  EM_PREPARO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['ENTREGUE', 'CANCELADO'],
  ENTREGUE: [],
  CANCELADO: [],
};

/** Pedidos que ainda estão em andamento (bloqueiam o fechamento do caixa). */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ['NOVO', 'EM_PREPARO', 'PRONTO'];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Formas de pagamento disponíveis no caixa. */
export const PAYMENT_METHODS = ['PIX', 'DINHEIRO', 'CARTAO'] as const;
export type SelectablePaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Inclui códigos que só existem em pedidos antigos: `VALE` (opção descontinuada) e
 * `NAO_INFORMADO` (pedidos importados da v1 sem forma de pagamento).
 */
export type PaymentMethod = SelectablePaymentMethod | 'VALE' | 'NAO_INFORMADO';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  VALE: 'Vale-refeição',
  NAO_INFORMADO: 'Não informado',
};

/** Nome usado quando o pedido é feito sem identificar o cliente. */
export const DEFAULT_CUSTOMER = 'Balcão';

/** Minutos sem atualização para um pedido ser destacado como atrasado na cozinha. */
export const LATE_ORDER_MINUTES = 15;
