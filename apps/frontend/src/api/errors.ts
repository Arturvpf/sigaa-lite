/** Erro vindo da API, no formato padrão { code, message, details? }. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Falha de comunicação (servidor fora do ar, sem internet): vale tentar de novo. */
  get isNetworkError() {
    return this.status === 0;
  }

  /** Recusa por regra de negócio ou conflito: tentar de novo não adianta. */
  get isBusinessRule() {
    return this.status === 409 || this.status === 422;
  }
}

export const MENSAGEM_FALHA_REDE =
  'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.';

/** Mensagem amigável para qualquer erro, com fallback para erros inesperados. */
export function mensagemDeErro(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Algo deu errado. Tente novamente.';
}
