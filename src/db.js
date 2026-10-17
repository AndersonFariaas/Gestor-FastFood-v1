const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

async function initDB(filename) {
    const db = await open({ filename, driver: sqlite3.Database });

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
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL
        );
    `);

    const orderColumns = await db.all('PRAGMA table_info(orders)');
    if (!orderColumns.some(c => c.name === 'paymentMethod')) {
        await db.exec(`ALTER TABLE orders ADD COLUMN paymentMethod TEXT DEFAULT 'Não informado'`);
    }

    await db.run('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
    await ensureAdmin(db);

    console.log('📦 Banco de dados SQLite conectado e pronto!');
    return db;
}

// No primeiro uso cria o admin com a senha de ADMIN_PASSWORD (ou uma senha aleatória exibida uma única vez).
async function ensureAdmin(db) {
    const { count } = await db.get('SELECT COUNT(*) AS count FROM users');
    if (count > 0) return;

    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
    await db.run('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), 'admin', await bcrypt.hash(password, 10), 'admin']);

    console.log('👤 Usuário "admin" criado.');
    if (!process.env.ADMIN_PASSWORD) console.log(`🔑 Senha inicial do admin: ${password}  (anote, ela não será exibida novamente)`);
}

async function getFullState(db) {
    const products = await db.all('SELECT * FROM products');
    // Envia apenas os pedidos do turno atual para as telas.
    const orders = await db.all(`SELECT * FROM orders WHERE status != 'ARQUIVADO'`);
    return {
        products: products.map(p => ({ ...p, active: p.active === 1 })),
        orders: orders.map(o => ({ ...o, items: JSON.parse(o.items) })),
    };
}

module.exports = { initDB, getFullState };
