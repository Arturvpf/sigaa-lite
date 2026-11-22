import { sessaoStorage } from '../auth/session';
import { ApiError, MENSAGEM_FALHA_REDE } from './errors';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3333').replace(/\/$/, '');

type QueryValue = string | number | undefined;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

/** Chamado quando a API responde 401 com sessão ativa (token expirado ou inválido). */
let aoExpirarSessao: () => void = () => {};

export function definirAoExpirarSessao(callback: () => void) {
  aoExpirarSessao = callback;
}

/**
 * Cliente HTTP único da aplicação:
 * - injeta o token da sessão no cabeçalho Authorization;
 * - converte qualquer erro no formato padrão da API em ApiError;
 * - converte falha de rede em ApiError com status 0;
 * - em 401 com sessão ativa, avisa o AuthProvider para encerrar a sessão.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const sessao = sessaoStorage.ler();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (sessao) headers.Authorization = `Bearer ${sessao.token}`;

  let response: Response;
  try {
    response = await fetch(montarUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'FALHA_DE_REDE', MENSAGEM_FALHA_REDE);
  }

  if (response.status === 204) return undefined as T;

  const corpo: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const erro = paraApiError(response.status, corpo);
    if (response.status === 401 && sessao) aoExpirarSessao();
    throw erro;
  }
  return corpo as T;
}

function montarUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(BASE_URL + path);
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== '') url.searchParams.set(chave, String(valor));
  }
  return url.toString();
}

function paraApiError(status: number, corpo: unknown): ApiError {
  if (corpo && typeof corpo === 'object' && 'code' in corpo && 'message' in corpo) {
    const { code, message, details } = corpo as {
      code: string;
      message: string;
      details?: unknown;
    };
    return new ApiError(status, code, message, details);
  }
  return new ApiError(status, 'ERRO_INESPERADO', 'O servidor respondeu com um erro inesperado.');
}
