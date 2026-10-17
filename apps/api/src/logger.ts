import { pino, type Logger } from 'pino';
import type { Config } from './config.ts';

export type { Logger };

export function createLogger(config: Pick<Config, 'env' | 'logLevel'>): Logger {
  return pino({
    level: config.logLevel,
    redact: ['req.headers.cookie', 'res.headers["set-cookie"]'],
    ...(config.env === 'development' && {
      transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    }),
  });
}
