import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Usado quando o usuário não existe, para o tempo de resposta não revelar quais usuários são válidos.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_ROUNDS);
export const verifyPasswordOrDummy = (password: string, hash: string | undefined) =>
  bcrypt.compare(password, hash ?? DUMMY_HASH);

export const generateToken = () => randomBytes(32).toString('base64url');
export const generatePassword = () => randomBytes(9).toString('base64url');

/** Tokens de sessão são guardados apenas como hash: um vazamento do banco não expõe sessões válidas. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    try {
      cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      // cookie malformado: ignora
    }
  }
  return cookies;
}
