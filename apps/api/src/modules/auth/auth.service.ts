import type { ChangePasswordInput, LoginInput, User } from '@fastfood/shared';
import { AppError, badRequest, unauthorized } from '../../lib/errors.ts';
import type { EventBus } from '../../lib/events.ts';
import { createRateLimiter } from '../../lib/rate-limiter.ts';
import {
  generateToken,
  hashPassword,
  hashToken,
  verifyPassword,
  verifyPasswordOrDummy,
} from '../../lib/security.ts';
import { toUser, type UsersRepository } from '../users/users.repository.ts';
import type { SessionsRepository } from './sessions.repository.ts';

export interface AuthSession {
  user: User;
  tokenHash: string;
}

interface Deps {
  users: UsersRepository;
  sessions: SessionsRepository;
  bus: EventBus;
  sessionTtlMs: number;
}

const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000;

export function createAuthService({ users, sessions, bus, sessionTtlMs }: Deps) {
  const limiter = createRateLimiter({ max: LOGIN_MAX_FAILURES, windowMs: LOGIN_LOCK_MS });

  const revoke = (tokenHashes: string[]) => {
    if (tokenHashes.length) bus.emit('session:revoked', { tokenHashes });
  };

  return {
    async login(
      { username, password }: LoginInput,
      clientIp: string,
    ): Promise<{ token: string; user: User }> {
      const key = `${clientIp}|${username.toLowerCase()}`;
      if (limiter.isBlocked(key)) {
        throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Muitas tentativas. Aguarde alguns minutos.');
      }

      const row = users.findByUsername(username);
      const valid = await verifyPasswordOrDummy(password, row?.password_hash);
      if (!row || !valid) {
        limiter.fail(key);
        throw unauthorized('Usuário ou senha incorretos.');
      }
      limiter.reset(key);

      const token = generateToken();
      sessions.insert(hashToken(token), row.id, Date.now() + sessionTtlMs);
      return { token, user: toUser(row) };
    },

    /** Resolve o token do cookie para a sessão ativa, ou `null`. */
    resolve(token: string | undefined): AuthSession | null {
      if (!token) return null;
      const tokenHash = hashToken(token);
      const row = sessions.findUser(tokenHash);
      return row ? { user: toUser(row), tokenHash } : null;
    },

    logout(tokenHash: string): void {
      sessions.delete(tokenHash);
      revoke([tokenHash]);
    },

    /** Troca a própria senha; as demais sessões do usuário são encerradas. */
    async changePassword(session: AuthSession, input: ChangePasswordInput): Promise<User> {
      const row = users.findById(session.user.id);
      if (!row) throw unauthorized();
      if (!(await verifyPassword(input.currentPassword, row.password_hash))) {
        throw badRequest('WRONG_PASSWORD', 'Senha atual incorreta.');
      }
      if (input.currentPassword === input.newPassword) {
        throw badRequest('SAME_PASSWORD', 'A nova senha precisa ser diferente da atual.');
      }

      users.update(row.id, {
        passwordHash: await hashPassword(input.newPassword),
        mustChangePassword: false,
      });
      revoke(sessions.deleteByUser(row.id, session.tokenHash));
      return toUser(users.findById(row.id)!);
    },

    /** Encerra todas as sessões de um usuário (senha redefinida ou usuário removido). */
    revokeAll(userId: string): void {
      revoke(sessions.deleteByUser(userId));
    },

    purgeExpiredSessions(): number {
      return sessions.purgeExpired();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
