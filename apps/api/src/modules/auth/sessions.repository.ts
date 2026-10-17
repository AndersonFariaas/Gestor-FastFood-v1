import { execute, queryAll, queryOne, type Database } from '../../db/database.ts';
import type { UserRow } from '../users/users.repository.ts';

export function createSessionsRepository(db: Database) {
  return {
    insert(tokenHash: string, userId: string, expiresAt: number): void {
      execute(db, 'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [
        tokenHash,
        userId,
        new Date().toISOString(),
        expiresAt,
      ]);
    },

    /** Retorna o usuário dono da sessão, se ela existir e não estiver expirada. */
    findUser(tokenHash: string, now = Date.now()): UserRow | undefined {
      return queryOne<UserRow>(
        db,
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?`,
        [tokenHash, now],
      );
    },

    delete(tokenHash: string): void {
      execute(db, 'DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
    },

    /** Remove as sessões de um usuário (exceto `keepTokenHash`) e retorna os hashes removidos. */
    deleteByUser(userId: string, keepTokenHash = ''): string[] {
      const hashes = queryAll<{ token_hash: string }>(
        db,
        'SELECT token_hash FROM sessions WHERE user_id = ? AND token_hash != ?',
        [userId, keepTokenHash],
      ).map((r) => r.token_hash);
      execute(db, 'DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', [userId, keepTokenHash]);
      return hashes;
    },

    purgeExpired(now = Date.now()): number {
      return execute(db, 'DELETE FROM sessions WHERE expires_at <= ?', [now]);
    },
  };
}

export type SessionsRepository = ReturnType<typeof createSessionsRepository>;
