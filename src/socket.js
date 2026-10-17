const crypto = require('crypto');
const { AppError, toErrorResponse } = require('./errors');
const { getFullState } = require('./db');
const { OrderInput, OrderStatusInput, ProductInput, ProductUpdateInput, ProductId } = require('./schemas');

// Transições de status permitidas. Cancelar é exclusivo da gerência.
const STATUS_TRANSITIONS = {
    NOVO: ['EM_PREPARO', 'CANCELADO'],
    EM_PREPARO: ['PRONTO', 'CANCELADO'],
    PRONTO: ['ENTREGUE', 'CANCELADO'],
};

const forbidden = () => new AppError('FORBIDDEN', 'Ação permitida apenas para a gerência.');

function registerSocketHandlers(io, db) {
    const broadcastState = async () => io.emit('sync', await getFullState(db));

    io.on('connection', async (socket) => {
        const user = socket.data.user;

        // Envolve cada evento com: checagem de perfil, validação, try/catch e resposta via ack.
        const on = (event, { role, schema } = {}, fn) => {
            socket.on(event, async (payload, ack) => {
                if (typeof payload === 'function') [payload, ack] = [undefined, payload];
                const reply = typeof ack === 'function' ? ack : () => { };
                try {
                    if (role && user.role !== role) throw forbidden();
                    const input = schema ? schema.parse(payload) : payload;
                    reply({ ok: true, data: await fn(input) });
                } catch (err) {
                    reply(toErrorResponse(err));
                }
            });
        };

        // 1. Pedidos
        on('newOrder', { schema: OrderInput }, async ({ items, customer, note, paymentMethod }) => {
            const qtyById = new Map();
            for (const i of items) qtyById.set(i.productId, (qtyById.get(i.productId) || 0) + i.qty);

            const ids = [...qtyById.keys()];
            const products = await db.all(
                `SELECT id, name, price FROM products WHERE active = 1 AND id IN (${ids.map(() => '?').join(',')})`, ids);
            if (products.length !== ids.length) {
                throw new AppError('PRODUCT_UNAVAILABLE', 'Algum item do pedido não está mais disponível. Atualize o carrinho.');
            }

            const orderItems = products.map(p => ({ id: p.id, name: p.name, price: p.price, qty: qtyById.get(p.id) }));
            const total = Math.round(orderItems.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
            const order = {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                status: 'NOVO',
                customer: customer || 'Balcão',
                note,
                total,
                items: orderItems,
                paymentMethod,
            };

            // Número calculado e gravado na mesma instrução: dois caixas simultâneos não geram senhas repetidas.
            const { number } = await db.get(`
                INSERT INTO orders (id, number, createdAt, status, customer, note, total, items, paymentMethod)
                SELECT ?, COALESCE(MAX(number), 0) + 1, ?, ?, ?, ?, ?, ?, ?
                FROM orders WHERE status != 'ARQUIVADO'
                RETURNING number`,
                [order.id, order.createdAt, order.status, order.customer, order.note, order.total, JSON.stringify(order.items), order.paymentMethod]);

            const saved = { ...order, number };
            io.emit('orderAdded', saved);
            return saved;
        });

        on('updateOrderStatus', { schema: OrderStatusInput }, async ({ id, status }) => {
            const order = await db.get('SELECT status FROM orders WHERE id = ?', [id]);
            if (!order) throw new AppError('NOT_FOUND', 'Pedido não encontrado.');
            if (!STATUS_TRANSITIONS[order.status]?.includes(status)) {
                throw new AppError('INVALID_TRANSITION', 'Este pedido já foi atualizado em outra tela.');
            }
            if (status === 'CANCELADO' && user.role !== 'admin') throw forbidden();

            await db.run('UPDATE orders SET status = ? WHERE id = ? AND status = ?', [status, id, order.status]);
            io.emit('orderStatusChanged', { id, status });
        });

        // 2. Produtos (gerência)
        on('addProduct', { role: 'admin', schema: ProductInput }, async (p) => {
            await db.run('INSERT INTO products (id, name, price, category, description, active) VALUES (?, ?, ?, ?, ?, ?)',
                [crypto.randomUUID(), p.name, p.price, p.category, p.description, p.active ? 1 : 0]);
            await broadcastState();
        });

        on('updateProduct', { role: 'admin', schema: ProductUpdateInput }, async (p) => {
            const { changes } = await db.run(
                'UPDATE products SET name = ?, price = ?, category = ?, description = ?, active = ? WHERE id = ?',
                [p.name, p.price, p.category, p.description, p.active ? 1 : 0, p.id]);
            if (!changes) throw new AppError('NOT_FOUND', 'Produto não encontrado.');
            await broadcastState();
        });

        on('deleteProduct', { role: 'admin', schema: ProductId }, async (id) => {
            await db.run('DELETE FROM products WHERE id = ?', [id]);
            await broadcastState();
        });

        // 3. Fechamento e histórico (gerência)
        on('clearOrders', { role: 'admin' }, async () => {
            await db.run('DELETE FROM orders');
            await broadcastState();
        });

        on('closeRegister', { role: 'admin' }, async () => {
            await db.run(`UPDATE orders SET status = 'ARQUIVADO' WHERE status != 'ARQUIVADO'`);
            await broadcastState();
        });

        try {
            socket.emit('session', user);
            socket.emit('sync', await getFullState(db));
        } catch (err) {
            console.error('❌ Falha ao sincronizar cliente:', err);
            socket.disconnect(true);
        }
    });
}

module.exports = { registerSocketHandlers };
