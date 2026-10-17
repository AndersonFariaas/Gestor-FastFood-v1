import type { Role, User } from '@fastfood/shared';
import { execute, queryAll, queryOne, type Database, type SqlParam } from '../../db/database.ts';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: Role;
  must_change_password: number;
  created_at: string;
}

export const toUser = (row: UserRow): User => ({
  id: row.id,
  username: row.username,
  role: row.role,
  mustChangePassword: row.must_change_password === 1,
  createdAt: row.created_at,
});

export function createUsersRepository(db: Database) {
  return {
    list(): User[] {
      return queryAll<UserRow>(db, 'SELECT * FROM users ORDER BY username').map(toUser);
    },

    findById(id: string): UserRow | undefined {
      return queryOne<UserRow>(db, 'SELECT * FROM users WHERE id = ?', [id]);
    },

    findByUsername(username: string): UserRow | undefined {
      return queryOne<UserRow>(db, 'SELECT * FROM users WHERE username = ?', [username]);
    },

    count(role?: Role): number {
      const row = role
        ? queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM users WHERE role = ?', [role])
        : queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM users');
      return row?.n ?? 0;
    },

    insert(user: {
      id: string;
      username: string;
      passwordHash: string;
      role: Role;
      mustChangePassword: boolean;
      createdAt: string;
    }): void {
      execute(
        db,
        `INSERT INTO users (id, username, password_hash, role, must_change_password, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.username,
          user.passwordHash,
          user.role,
          user.mustChangePassword ? 1 : 0,
          user.createdAt,
        ],
      );
    },

    update(id: string, changes: { role?: Role; passwordHash?: string; mustChangePassword?: boolean }): void {
      const sets: string[] = [];
      const params: SqlParam[] = [];
      if (changes.role !== undefined) {
        sets.push('role = ?');
        params.push(changes.role);
      }
      if (changes.passwordHash !== undefined) {
        sets.push('password_hash = ?');
        params.push(changes.passwordHash);
      }
      if (changes.mustChangePassword !== undefined) {
        sets.push('must_change_password = ?');
        params.push(changes.mustChangePassword ? 1 : 0);
      }
      if (sets.length) execute(db, `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
    },

    delete(id: string): void {
      execute(db, 'DELETE FROM users WHERE id = ?', [id]);
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
