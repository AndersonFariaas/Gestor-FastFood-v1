import { createServer } from 'node:http';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createServices } from './container.ts';
import { openDatabase } from './db/database.ts';
import { migrate } from './db/migrate.ts';
import { createEventBus } from './lib/events.ts';
import { createLogger } from './logger.ts';
import { attachRealtime } from './realtime.ts';

const config = loadConfig();
const logger = createLogger(config);

const db = openDatabase(config.dbPath);
const applied = migrate(db);
if (applied.length) logger.info(`Migrações aplicadas: ${applied.join(', ')}`);

const bus = createEventBus();
const services = createServices({ db, bus, sessionTtlMs: config.sessionTtlMs });

const initialPassword = await services.users.ensureInitialAdmin(config.adminPassword);
if (initialPassword) {
  logger.warn(`Usuário "admin" criado. Senha inicial: ${initialPassword} (troque no primeiro acesso)`);
}
services.shifts.ensureOpenShift();

const app = createApp({ services, logger, config });
const server = createServer(app);
const io = attachRealtime(server, { auth: services.auth, bus });

const purgeTimer = setInterval(() => services.auth.purgeExpiredSessions(), 60 * 60 * 1000);
purgeTimer.unref();

server.listen(config.port, config.host, () => {
  logger.info(`API rodando em http://${config.host}:${config.port}`);
  if (!config.webDist) logger.info('Front-end não compilado: use `npm run dev` ou `npm run build`.');
});

function shutdown(signal: string) {
  logger.info(`${signal} recebido, encerrando...`);
  clearInterval(purgeTimer);
  void io.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
