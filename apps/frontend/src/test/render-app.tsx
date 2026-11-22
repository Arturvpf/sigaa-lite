import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { AuthProvider } from '../auth/AuthProvider';
import { type Sessao, sessaoStorage } from '../auth/session';
import { ToastProvider } from '../components/toast/ToastProvider';
import { routes } from '../routes';

export const sessaoAluno: Sessao = {
  token: 'token-aluno',
  usuario: {
    id: 2,
    username: 'ana',
    perfil: 'ALUNO',
    aluno: { id: 1, nome: 'Ana Beatriz Lima', curso: { id: 1, nome: 'Ciência da Computação' } },
  },
};

export const sessaoSecretaria: Sessao = {
  token: 'token-secretaria',
  usuario: { id: 1, username: 'secretaria', perfil: 'SECRETARIA', aluno: null },
};

/** Monta a aplicação real (rotas e providers) num roteador em memória. */
export function renderApp(
  caminho: string,
  opcoes: { sessao?: Sessao; rotas?: RouteObject[] } = {},
) {
  if (opcoes.sessao) sessaoStorage.salvar(opcoes.sessao);

  const router = createMemoryRouter(opcoes.rotas ?? routes, { initialEntries: [caminho] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const resultado = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...resultado, router };
}

function Providers({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

type Rotas = Record<string, Response | ((corpo: unknown) => Response)>;

/**
 * Simula a API: cada chave é "MÉTODO /caminho" (sem query string). Chamadas a rotas
 * não declaradas falham com 500, para o teste não passar por acidente.
 * Devolve a lista de chamadas feitas, para conferir o que a tela enviou.
 */
export function simularApi(
  fetchMock: { mockImplementation: (fn: typeof fetch) => unknown },
  rotas: Rotas,
) {
  const chamadas: { metodo: string; caminho: string; query: string; corpo: unknown }[] = [];
  fetchMock.mockImplementation(async (entrada, init) => {
    const url = new URL(String(entrada));
    const metodo = init?.method ?? 'GET';
    const corpo = init?.body ? JSON.parse(String(init.body)) : undefined;
    chamadas.push({ metodo, caminho: url.pathname, query: url.search, corpo });
    const resposta = rotas[`${metodo} ${url.pathname}`];
    if (!resposta) return respostaJson(500, { code: 'ROTA_NAO_SIMULADA', message: url.pathname });
    return typeof resposta === 'function' ? resposta(corpo) : resposta.clone();
  });
  return chamadas;
}

/** Resposta JSON para mocks de fetch. */
export function respostaJson(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
