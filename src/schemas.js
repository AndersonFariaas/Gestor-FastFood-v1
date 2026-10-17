const { z } = require('zod');

const PAYMENT_METHODS = ['Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Dinheiro', 'Vale Alimentação/Refeição'];
const ORDER_STATUSES = ['NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'];

const text = (max) => z.string().trim().max(max);
const id = z.string().min(1).max(64);

const LoginInput = z.object({
    username: text(40).min(1),
    password: z.string().min(1).max(200),
});

// O cliente só informa O QUE quer; preço, total, número e horário são calculados no servidor.
const OrderInput = z.object({
    items: z.array(z.object({
        productId: id,
        qty: z.number().int().min(1).max(99),
    })).min(1).max(50),
    customer: text(60).default(''),
    note: text(200).default(''),
    paymentMethod: z.enum(PAYMENT_METHODS),
});

const OrderStatusInput = z.object({
    id,
    status: z.enum(ORDER_STATUSES),
});

const ProductInput = z.object({
    name: text(80).min(1),
    price: z.number().finite().min(0).max(100000).transform(v => Math.round(v * 100) / 100),
    category: text(40).min(1),
    description: text(200).default(''),
    active: z.boolean().default(true),
});

const ProductUpdateInput = ProductInput.extend({ id });

module.exports = {
    PAYMENT_METHODS,
    ORDER_STATUSES,
    LoginInput,
    OrderInput,
    OrderStatusInput,
    ProductInput,
    ProductUpdateInput,
    ProductId: id,
};
