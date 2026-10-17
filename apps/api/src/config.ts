import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';

const API_ROOT = resolve(import.meta.dirname, '..');

// Variáveis vazias (ex.: `ADMIN_PASSWORD=`) contam como não definidas.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  DB_PATH: z.string().default('data/fastfood.db'),
  WEB_DIST: optional(z.string()),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(168),
  COOKIE_SECURE: z.stringbool().default(false),
  ADMIN_PASSWORD: optional(z.string().min(8, 'ADMIN_PASSWORD precisa ter pelo menos 8 caracteres')),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_FORMAT: z.enum(['auto', 'pretty', 'json']).default('auto'),
});

export interface Config {
  env: 'development' | 'test' | 'production';
  port: number;
  host: string;
  dbPath: string;
  /** Pasta do front-end compilado (servida pela API), ou `null` se não existir. */
  webDist: string | null;
  sessionTtlMs: number;
  cookieSecure: boolean;
  adminPassword: string | undefined;
  logLevel: string;
  /** `auto`: legível no terminal, JSON quando a saída é redirecionada (serviço, arquivo). */
  logFormat: 'auto' | 'pretty' | 'json';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // `apps/api/.env` é opcional; carregado aqui para não exibir aviso quando não existe.
  const envFile = join(API_ROOT, '.env');
  if (env === process.env && existsSync(envFile)) process.loadEnvFile(envFile);

  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(parsed.error)}`);
  }
  const e = parsed.data;
  const webDist = e.WEB_DIST ? resolve(e.WEB_DIST) : resolve(API_ROOT, '../web/dist');

  return {
    env: e.NODE_ENV,
    port: e.PORT,
    host: e.HOST,
    dbPath: e.DB_PATH === ':memory:' ? e.DB_PATH : resolve(API_ROOT, e.DB_PATH),
    webDist: existsSync(join(webDist, 'index.html')) ? webDist : null,
    sessionTtlMs: e.SESSION_TTL_HOURS * 60 * 60 * 1000,
    cookieSecure: e.COOKIE_SECURE,
    adminPassword: e.ADMIN_PASSWORD,
    logLevel: e.LOG_LEVEL,
    logFormat: e.LOG_FORMAT,
  };
}
