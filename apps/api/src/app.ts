import { join } from 'node:path';
import express, { type Express } from 'express';
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
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => !req.url?.startsWith('/api') } }));

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
