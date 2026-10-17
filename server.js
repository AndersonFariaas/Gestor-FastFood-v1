const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const config = require('./src/config');
const { initDB } = require('./src/db');
const { createAuth } = require('./src/auth');
const { registerSocketHandlers } = require('./src/socket');

async function main() {
    const db = await initDB(config.dbPath);
    const auth = createAuth(db, config);

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    // Ao sair, derruba também as conexões em tempo real daquela sessão.
    const disconnectSession = (tokenHash) => {
        for (const s of io.sockets.sockets.values()) {
            if (s.data.tokenHash === tokenHash) s.disconnect(true);
        }
    };

    app.disable('x-powered-by');
    app.use(auth.router({ onLogout: disconnectSession }));
    app.use(auth.pageGuard);
    app.use(express.static(path.join(__dirname, 'public')));

    app.use((err, req, res, _next) => {
        if (err.type === 'entity.parse.failed') return res.status(400).json({ ok: false, message: 'Requisição inválida.' });
        console.error('❌ Erro na requisição:', err);
        res.status(500).json({ ok: false, message: 'Erro interno no servidor.' });
    });

    io.use(auth.socketMiddleware);
    registerSocketHandlers(io, db);

    server.listen(config.port, config.host, () => {
        console.log(`🚀 Servidor rodando na porta ${config.port}`);
    });
}

main().catch((err) => {
    console.error('❌ Falha ao iniciar o servidor:', err);
    process.exit(1);
});
