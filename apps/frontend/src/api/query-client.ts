import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './errors';

/**
 * Configuração do TanStack Query (estado do servidor):
 * - só tenta de novo automaticamente falhas transitórias (rede ou 5xx), no máximo 2 vezes;
 *   4xx (validação, regra de negócio, 401/403/404) não mudam tentando de novo;
 * - mutações (matricular, cancelar) nunca são repetidas sozinhas.
 */
export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (tentativas, error) =>
          tentativas < 2 &&
          error instanceof ApiError &&
          (error.isNetworkError || error.status >= 500),
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  });
}
