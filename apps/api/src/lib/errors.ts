/** Erro esperado da aplicação: a mensagem é segura para exibir ao usuário. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (code: string, message: string) => new AppError(400, code, message);

export const unauthorized = (message = 'Sessão expirada. Faça login novamente.') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Ação permitida apenas para a gerência.') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Registro não encontrado.') => new AppError(404, 'NOT_FOUND', message);

export const conflict = (code: string, message: string) => new AppError(409, code, message);
