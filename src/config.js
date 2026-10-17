const path = require('path');

module.exports = {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'lanchonete.sqlite'),
    sessionTtlMs: (Number(process.env.SESSION_TTL_HOURS) || 24 * 7) * 60 * 60 * 1000,
};
