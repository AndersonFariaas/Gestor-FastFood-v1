import { pino, type Logger } from 'pino';
import pretty from 'pino-pretty';
import type { Config } from './config.ts';

export type { Logger };

export function createLogger(config: Pick<Config, 'logLevel' | 'logFormat'>): Logger {
  const usePretty = config.logFormat === 'pretty' || (config.logFormat === 'auto' && process.stdout.isTTY);

  // Escreve via `process.stdout` (e não direto no descritor 1) para o terminal do Windows exibir acentos.
  const destination = usePretty
    ? pretty({
        destination: process.stdout,
        sync: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname,reqId,responseTime',
      })
    : process.stdout;

  return pino(
    { level: config.logLevel, redact: ['req.headers.cookie', 'res.headers["set-cookie"]'] },
    destination,
  );
}
