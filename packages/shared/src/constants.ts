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
export const PAYMENT_METHODS = ['CREDITO', 'DEBITO', 'PIX', 'DINHEIRO', 'VALE'] as const;
export type SelectablePaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Inclui `NAO_INFORMADO`, usado apenas por pedidos importados do sistema antigo. */
export type PaymentMethod = SelectablePaymentMethod | 'NAO_INFORMADO';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CREDITO: 'Cartão de Crédito',
  DEBITO: 'Cartão de Débito',
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  VALE: 'Vale Alimentação/Refeição',
  NAO_INFORMADO: 'Não informado',
};

/** Minutos sem atualização para um pedido ser destacado como atrasado na cozinha. */
export const LATE_ORDER_MINUTES = 15;
