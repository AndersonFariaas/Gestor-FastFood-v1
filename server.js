const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const crypto = require('crypto');
const bcrypt = require('bcrypt'); // Adicionado para criptografia

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let db;

async function initDB() {
    db = await open({
        filename: './lanchonete.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, category TEXT, description TEXT, active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY, number INTEGER NOT NULL, createdAt TEXT NOT NULL, status TEXT NOT NULL, customer TEXT, note TEXT, total REAL NOT NULL, items TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL
        );
    `);

    try { await db.exec('ALTER TABLE orders ADD COLUMN paymentMethod TEXT DEFAULT "Não informado"'); } catch (e) { }

    // CRIAÇÃO DO ADMIN COM SENHA CRIPTOGRAFADA
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
        console.log("👤 Criando usuário Administrador padrão...");
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.run('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
            [crypto.randomUUID(), 'admin', hashedPassword, 'admin']
        );
    }
    console.log("📦 Banco de dados SQLite conectado e pronto!");
}

async function getFullState() {
    const productsRows = await db.all('SELECT * FROM products');
    // Envia apenas os pedidos válidos para as telas, otimizando a memória!
    const ordersRows = await db.all('SELECT * FROM orders WHERE status != "ARQUIVADO"');

    const formattedProducts = productsRows.map(p => ({ ...p, active: p.active === 1 }));
    const formattedOrders = ordersRows.map(o => ({ ...o, items: JSON.parse(o.items) }));
    return { products: formattedProducts, orders: formattedOrders };
}

io.on('connection', async (socket) => {

    // --- EVENTOS DE AUTENTICAÇÃO --- //
    socket.on('login', async (data, callback) => {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [data.username]);
        if (user) {
            const match = await bcrypt.compare(data.password, user.password);
            if (match) {
                delete user.password; // Remove a senha antes de mandar pro front-end
                callback({ success: true, user });
            } else {
                callback({ success: false, message: 'Usuário ou senha incorretos.' });
            }
        } else {
            callback({ success: false, message: 'Usuário não encontrado.' });
        }
    });

    socket.on('register', async (data, callback) => {
        try {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            await db.run('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
                [crypto.randomUUID(), data.username, hashedPassword, 'user'] // Força role 'user'
            );
            callback({ success: true, message: 'Usuário criado com sucesso!' });
        } catch (error) {
            callback({ success: false, message: 'Este nome de usuário já existe.' });
        }
    });

    // --- EVENTOS DE SINCRONIZAÇÃO (AÇÕES ATÔMICAS) --- //
    socket.emit('sync', await getFullState());

    // 1. Pedidos
    socket.on('newOrder', async (orderData) => {
        await db.run(
            'INSERT INTO orders (id, number, createdAt, status, customer, note, total, items, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [orderData.id, orderData.number, orderData.createdAt, orderData.status, orderData.customer, orderData.note, orderData.total, JSON.stringify(orderData.items), orderData.paymentMethod]
        );
        socket.broadcast.emit('orderAdded', orderData);
    });

    socket.on('updateOrderStatus', async (data) => {
        await db.run('UPDATE orders SET status = ? WHERE id = ?', [data.status, data.id]);
        socket.broadcast.emit('orderStatusChanged', data);
    });

    // 2. Produtos
    socket.on('addProduct', async (p) => {
        await db.run('INSERT INTO products (id, name, price, category, description, active) VALUES (?, ?, ?, ?, ?, ?)',
            [p.id, p.name, p.price, p.category, p.description, p.active ? 1 : 0]);
        io.emit('sync', await getFullState());
    });

    socket.on('updateProduct', async (p) => {
        await db.run('UPDATE products SET name = ?, price = ?, category = ?, description = ?, active = ? WHERE id = ?',
            [p.name, p.price, p.category, p.description, p.active ? 1 : 0, p.id]);
        io.emit('sync', await getFullState());
    });

    socket.on('deleteProduct', async (id) => {
        await db.run('DELETE FROM products WHERE id = ?', [id]);
        io.emit('sync', await getFullState());
    });

    // 3. Fechamento e Histórico
    socket.on('clearOrders', async () => {
        await db.run('DELETE FROM orders');
        io.emit('sync', await getFullState());
    });

    socket.on('closeRegister', async () => {
        await db.run('UPDATE orders SET status = "ARQUIVADO" WHERE status != "ARQUIVADO"');
        io.emit('sync', await getFullState());
    });
});

initDB().then(() => {
    server.listen(3000, '0.0.0.0', () => {
        console.log(`🚀 Servidor rodando na porta 3000`);
    });
});