import type { ApiErrorBody, Role, User } from '@fastfood/shared';
import type { ErrorRequestHandler, Request, RequestHandler } from 'express';
import { z } from 'zod';
import { AppError, forbidden, unauthorized } from '../lib/errors.ts';
import { parseCookies } from '../lib/security.ts';
import type { Logger } from '../logger.ts';
import type { AuthService, AuthSession } from '../modules/auth/auth.service.ts';

export const SESSION_COOKIE = 'sid';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthSession;
  }
}

export const sessionToken = (req: Request) => parseCookies(req.headers.cookie)[SESSION_COOKIE];

/** Usuário autenticado da requisição (use após `authenticate`). */
export function currentUser(req: Request): User {
  if (!req.auth) throw unauthorized();
  return req.auth.user;
}

export function currentSession(req: Request): AuthSession {
  if (!req.auth) throw unauthorized();
  return req.auth;
}

/** Exige sessão válida. Com senha provisória, só libera as rotas de troca de senha e de sessão. */
export function authenticate(auth: AuthService, { allowPendingPassword = false } = {}): RequestHandler {
  return (req, _res, next) => {
    const session = auth.resolve(sessionToken(req));
    if (!session) throw unauthorized();
    if (session.user.mustChangePassword && !allowPendingPassword) {
      throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Defina uma nova senha para continuar.');
    }
    req.auth = session;
    next();
  };
}

export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (currentUser(req).role !== role) throw forbidden();
    next();
  };
}

export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Rota não encontrada.' } satisfies ApiErrorBody);
};

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    let status = 500;
    let body: ApiErrorBody = { code: 'INTERNAL', message: 'Erro interno no servidor.' };

    if (err instanceof AppError) {
      status = err.status;
      body = { code: err.code, message: err.message };
    } else if (err instanceof z.ZodError) {
      status = 400;
      const issues = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      const first = issues[0];
      body = {
        code: 'INVALID_INPUT',
        message: first ? `Dados inválidos (${first.path || 'corpo'}): ${first.message}` : 'Dados inválidos.',
        issues,
      };
    } else if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
      status = err.status ?? 400;
      body = { code: 'INVALID_INPUT', message: 'Requisição inválida.' };
    } else {
      logger.error({ err, url: req.originalUrl }, 'Erro não tratado');
    }

    res.status(status).json(body);
  };
}
