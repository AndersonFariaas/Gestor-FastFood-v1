import { join } from 'node:path';
import express, { type Express, type Request } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Config } from './config.ts';
import type { Services } from './container.ts';
import { apiNotFound, authenticate, errorHandler } from './http/middleware.ts';
import { apiRoutes, authRoutes } from './http/routes.ts';
import type { Logger } from './logger.ts';

interface AppDeps {
  services: Services;
  logger: Logger;
  config: Pick<Config, 'sessionTtlMs' | 'cookieSecure' | 'webDist'>;
}

export function createApp({ services, logger, config }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      // O sistema roda em rede local via HTTP: não force HTTPS.
      strictTransportSecurity: false,
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
    }),
  );
  app.use(
    pinoHttp({
      logger,
      // Uma linha por requisição ("POST /api/orders 201 13ms"), sem cabeçalhos. Erros 500 já são
      // registrados com detalhes pelo `errorHandler`.
      quietReqLogger: true,
      quietResLogger: true,
      autoLogging: { ignore: (req) => !req.url?.startsWith('/api') || req.url === '/api/health' },
      customSuccessObject: () => ({}),
      customErrorObject: () => ({}),
      customSuccessMessage: (req, res, ms) =>
        `${req.method} ${(req as Request).originalUrl} ${res.statusCode} ${Math.round(ms)}ms`,
      customErrorMessage: (req, res) => `${req.method} ${(req as Request).originalUrl} ${res.statusCode}`,
      // Leituras ficam em `debug`; ações em `info`; falhas em `warn`/`error`. O 401 de "já estou logado?"
      // ao abrir a tela de login é esperado e não vira alerta.
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400 && !(req.method === 'GET' && res.statusCode === 401)) return 'warn';
        return req.method === 'GET' ? 'debug' : 'info';
      },
    }),
  );

  const routeDeps = { services, sessionTtlMs: config.sessionTtlMs, cookieSecure: config.cookieSecure };
  app.use('/api', express.json({ limit: '20kb' }));
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', authRoutes(routeDeps));
  app.use('/api', authenticate(services.auth), apiRoutes(routeDeps));
  app.use('/api', apiNotFound);

  // Em produção a API também entrega o front-end compilado (SPA).
  if (config.webDist) {
    const webDist = config.webDist;
    app.use(
      express.static(webDist, {
        index: false,
        setHeaders: (res, path) => {
          // Arquivos com hash no nome podem ficar em cache para sempre.
          if (/[\\/]assets[\\/]/.test(path))
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
    app.get('/{*path}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache').sendFile(join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler(logger));
  return app;
}
