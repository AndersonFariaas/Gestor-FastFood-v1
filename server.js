const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const crypto = require('crypto'); // Para gerar IDs únicos

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

    // 1. CRIANDO AS TABELAS (Agora com a tabela 'users')
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
    
    try {
        await db.exec('ALTER TABLE orders ADD COLUMN paymentMethod TEXT DEFAULT "Não informado"');
    } catch (e) {
        // Se cair aqui, a coluna já existe. Tudo certo!
    }

    // 2. CRIAR O ADMINISTRADOR PADRÃO SE NÃO EXISTIR
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
        console.log("👤 Criando usuário Administrador padrão...");
        await db.run('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
            [crypto.randomUUID(), 'admin', 'admin123', 'admin']
        );
    }
    console.log("📦 Banco de dados SQLite conectado e pronto!");
}

async function getFullState() {
    const productsRows = await db.all('SELECT * FROM products');
    const ordersRows = await db.all('SELECT * FROM orders');
    const formattedProducts = productsRows.map(p => ({ ...p, active: p.active === 1 }));
    const formattedOrders = ordersRows.map(o => ({ ...o, items: JSON.parse(o.items) }));
    return { products: formattedProducts, orders: formattedOrders };
}

io.on('connection', async (socket) => {
    console.log(`📱 Dispositivo conectado: ${socket.id}`);

    // --- EVENTOS DE AUTENTICAÇÃO --- //

    // Tentar Fazer Login
    socket.on('login', async (data, callback) => {
        const user = await db.get('SELECT username, role FROM users WHERE username = ? AND password = ?', [data.username, data.password]);
        if (user) {
            callback({ success: true, user }); // Retorna os dados do usuário, mas NUNCA a senha
        } else {
            callback({ success: false, message: 'Usuário ou senha incorretos.' });
        }
    });

    // Criar Novo Usuário
    socket.on('register', async (data, callback) => {
        try {
            await db.run('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
                [crypto.randomUUID(), data.username, data.password, data.role]
            );
            callback({ success: true, message: 'Usuário criado com sucesso!' });
        } catch (error) {
            callback({ success: false, message: 'Este nome de usuário já existe.' });
        }
    });

    // --- EVENTOS DO SISTEMA (Caixa/Cozinha) --- //
    const currentState = await getFullState();
    socket.emit('sync', currentState);

    socket.on('updateDB', async (newDB) => {
        try {
            await db.exec('BEGIN TRANSACTION');

            await db.exec('DELETE FROM products');
            for (let p of newDB.products) {
                await db.run('INSERT INTO products (id, name, price, category, description, active) VALUES (?, ?, ?, ?, ?, ?)', [p.id, p.name, p.price, p.category, p.description, p.active ? 1 : 0]);
            }

            await db.exec('DELETE FROM orders');
            for (let o of newDB.orders) {
                await db.run(
                    'INSERT INTO orders (id, number, createdAt, status, customer, note, total, items, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [o.id, o.number, o.createdAt, o.status, o.customer, o.note, o.total, JSON.stringify(o.items), o.paymentMethod || 'Não informado']
                );
            }

            await db.exec('COMMIT');
            const updatedState = await getFullState();
            socket.broadcast.emit('sync', updatedState);
        } catch (error) {
            await db.exec('ROLLBACK');
            console.error("❌ Erro fatal ao salvar no banco:", error);
        }
    });
});

initDB().then(() => {
    server.listen(3000, '0.0.0.0', () => {
        console.log(`🚀 Servidor rodando na porta 3000`);
    });
});