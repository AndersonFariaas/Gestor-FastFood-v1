const crypto = require('crypto');
const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const { LoginInput } = require('./schemas');

const COOKIE_NAME = 'sid';
const ADMIN_PAGES = new Set(['cardapio.html', 'fechamento.html']);
// Arquivos acessíveis sem login (exatamente estes caminhos).
const PUBLIC_PATHS = new Set(['/login.html', '/js/app.js', '/js/login.js']);

const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000;

// Usado quando o usuário não existe, para o tempo de resposta não revelar quais usuários são válidos.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const publicUser = (u) => ({ id: u.id, username: u.username, role: u.role });

function parseCookies(header = '') {
    const cookies = {};
    for (const part of header.split(';')) {
        const i = part.indexOf('=');
        if (i > 0) cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return cookies;
}

function createLoginLimiter() {
    const attempts = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [key, a] of attempts) if (a.until < now) attempts.delete(key);
    }, LOGIN_LOCK_MS).unref();

    return {
        isBlocked: (key) => {
            const a = attempts.get(key);
            return Boolean(a && a.count >= MAX_LOGIN_FAILURES && a.until > Date.now());
        },
        fail: (key) => {
            const a = attempts.get(key);
            const count = a && a.until > Date.now() ? a.count + 1 : 1;
            attempts.set(key, { count, until: Date.now() + LOGIN_LOCK_MS });
        },
        reset: (key) => attempts.delete(key),
    };
}

function createAuth(db, { sessionTtlMs }) {
    const limiter = createLoginLimiter();

    async function getSession(token) {
        if (!token) return null;
        const tokenHash = hashToken(token);
        const row = await db.get(`
            SELECT s.expires_at, u.id, u.username, u.role
            FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ?`, [tokenHash]);
        if (!row) return null;
        if (row.expires_at < Date.now()) {
            await db.run('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
            return null;
        }
        return { tokenHash, user: publicUser(row) };
    }

    const sessionFromRequest = (req) => getSession(parseCookies(req.headers.cookie)[COOKIE_NAME]);

    function sessionCookie(token, maxAgeMs) {
        return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}`;
    }

    // Rotas HTTP de login/logout. `onLogout` recebe o hash da sessão encerrada.
    function router({ onLogout } = {}) {
        const r = express.Router();
        r.use('/api', express.json({ limit: '10kb' }));

        r.post('/api/login', async (req, res) => {
            const parsed = LoginInput.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ ok: false, message: 'Informe usuário e senha.' });

            const { username, password } = parsed.data;
            const key = `${req.ip}|${username.toLowerCase()}`;
            if (limiter.isBlocked(key)) {
                return res.status(429).json({ ok: false, message: 'Muitas tentativas. Aguarde alguns minutos.' });
            }

            const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
            const match = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
            if (!user || !match) {
                limiter.fail(key);
                return res.status(401).json({ ok: false, message: 'Usuário ou senha incorretos.' });
            }
            limiter.reset(key);

            const token = crypto.randomBytes(32).toString('base64url');
            await db.run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
                [hashToken(token), user.id, Date.now() + sessionTtlMs]);

            res.setHeader('Set-Cookie', sessionCookie(token, sessionTtlMs));
            res.json({ ok: true, user: publicUser(user) });
        });

        r.post('/api/logout', async (req, res) => {
            const session = await sessionFromRequest(req);
            if (session) {
                await db.run('DELETE FROM sessions WHERE token_hash = ?', [session.tokenHash]);
                onLogout?.(session.tokenHash);
            }
            res.setHeader('Set-Cookie', sessionCookie('', 0));
            res.json({ ok: true });
        });

        return r;
    }

    // Bloqueia arquivos estáticos para quem não está logado e páginas de gerência para operadores.
    // A proteção real dos dados fica nos eventos do socket; isto evita exibir telas sem permissão.
    async function pageGuard(req, res, next) {
        if (PUBLIC_PATHS.has(req.path)) return next();

        const isPage = req.path === '/' || /\.html?$/i.test(req.path);
        const session = await sessionFromRequest(req);
        if (!session) {
            if (!isPage) return res.status(401).end();
            const page = path.posix.basename(req.path) || 'index.html';
            return res.redirect(`/login.html?redirect=${encodeURIComponent(page)}`);
        }

        // Normaliza variações que o Windows aceita como o mesmo arquivo (maiúsculas, ponto/espaço final, "::$DATA").
        const file = path.posix.basename(req.path).split(':')[0].replace(/[. ]+$/, '').toLowerCase();
        if (ADMIN_PAGES.has(file) && session.user.role !== 'admin') return res.redirect('/index.html');

        req.user = session.user;
        next();
    }

    // Recusa conexões socket sem sessão válida.
    function socketMiddleware(socket, next) {
        getSession(parseCookies(socket.request.headers.cookie)[COOKIE_NAME])
            .then(session => {
                if (!session) return next(new Error('unauthorized'));
                socket.data.user = session.user;
                socket.data.tokenHash = session.tokenHash;
                next();
            })
            .catch(next);
    }

    return { router, pageGuard, socketMiddleware };
}

module.exports = { createAuth };
