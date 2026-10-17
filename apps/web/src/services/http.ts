import type { ApiErrorBody } from '@fastfood/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
  }
}

type SessionLostHandler = (error: ApiError) => void;
let sessionLostHandler: SessionLostHandler | null = null;

/** Chamado quando a API indica sessão expirada (401) ou troca de senha obrigatória. */
export function onSessionLost(handler: SessionLostHandler) {
  sessionLostHandler = handler;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function http<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, { code: 'NETWORK', message: 'Sem conexão com o servidor.' });
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new ApiError(
      res.status,
      (data as ApiErrorBody | null) ?? {
        code: `HTTP_${res.status}`,
        message: 'Erro inesperado no servidor.',
      },
    );
    if (res.status === 401 || error.code === 'PASSWORD_CHANGE_REQUIRED') sessionLostHandler?.(error);
    throw error;
  }
  return data as T;
}

/** Mensagem amigável para qualquer erro capturado. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro inesperado.';
}
