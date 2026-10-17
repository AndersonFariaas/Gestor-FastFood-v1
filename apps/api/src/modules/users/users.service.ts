import { randomUUID } from 'node:crypto';
import type { CreateUserInput, UpdateUserInput, User } from '@fastfood/shared';
import { transaction, type Database } from '../../db/database.ts';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { generatePassword, hashPassword } from '../../lib/security.ts';
import type { AuthService } from '../auth/auth.service.ts';
import { toUser, type UsersRepository } from './users.repository.ts';

interface Deps {
  db: Database;
  users: UsersRepository;
  auth: AuthService;
}

export function createUsersService({ db, users, auth }: Deps) {
  const assertKeepsAnAdmin = (target: User) => {
    if (target.role === 'admin' && users.count('admin') <= 1) {
      throw conflict('LAST_ADMIN', 'O sistema precisa de pelo menos um gerente.');
    }
  };

  return {
    list: (): User[] => users.list(),

    async create(input: CreateUserInput): Promise<User> {
      if (users.findByUsername(input.username)) {
        throw conflict('USERNAME_TAKEN', 'Já existe um usuário com este nome.');
      }
      const id = randomUUID();
      // O usuário define a própria senha no primeiro acesso.
      users.insert({
        id,
        username: input.username,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      });
      return toUser(users.findById(id)!);
    },

    async update(id: string, input: UpdateUserInput, actor: User): Promise<User> {
      const row = users.findById(id);
      if (!row) throw notFound('Usuário não encontrado.');
      const target = toUser(row);
      if (input.password && target.id === actor.id) {
        throw badRequest('SELF_PASSWORD', 'Para alterar a própria senha, use "Trocar senha".');
      }
      const passwordHash = input.password ? await hashPassword(input.password) : undefined;

      transaction(db, () => {
        if (input.role && input.role !== target.role) {
          if (target.id === actor.id)
            throw badRequest('SELF_ROLE', 'Você não pode alterar o próprio perfil.');
          assertKeepsAnAdmin(target);
        }
        users.update(id, {
          ...(input.role && { role: input.role }),
          ...(passwordHash && { passwordHash, mustChangePassword: true }),
        });
      });

      // Senha redefinida ou perfil alterado: força novo login com as permissões corretas.
      auth.revokeAll(id);
      return toUser(users.findById(id)!);
    },

    remove(id: string, actor: User): void {
      const row = users.findById(id);
      if (!row) throw notFound('Usuário não encontrado.');
      if (row.id === actor.id) throw badRequest('SELF_DELETE', 'Você não pode remover o próprio usuário.');

      transaction(db, () => {
        assertKeepsAnAdmin(toUser(row));
        auth.revokeAll(id);
        users.delete(id);
      });
    },

    /** No primeiro uso cria o usuário `admin`. Retorna a senha gerada, se não foi informada. */
    async ensureInitialAdmin(password?: string): Promise<string | null> {
      if (users.count() > 0) return null;
      const initialPassword = password ?? generatePassword();
      users.insert({
        id: randomUUID(),
        username: 'admin',
        passwordHash: await hashPassword(initialPassword),
        role: 'admin',
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      });
      return password ? null : initialPassword;
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
