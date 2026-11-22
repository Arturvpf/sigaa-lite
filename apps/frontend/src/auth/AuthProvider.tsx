import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { api, definirAoExpirarSessao } from '../api/client';
import { AuthContext, type AuthContextValue } from './auth-context';
import { type Sessao, sessaoStorage, type Usuario } from './session';

interface LoginResponse {
  token: string;
  expiresIn: number;
  usuario: Usuario;
}

/**
 * Mantém o usuário logado. A fonte da verdade do token é o storage (lido pelo cliente HTTP);
 * aqui fica o estado React para as telas reagirem a login, logout e expiração.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sessao, setSessao] = useState<Sessao | null>(() => sessaoStorage.ler());
  const [sessaoExpirada, setSessaoExpirada] = useState(false);

  const encerrar = useCallback(
    (expirou: boolean) => {
      sessaoStorage.limpar();
      setSessao(null);
      setSessaoExpirada(expirou);
      // Dados em cache pertencem ao usuário que saiu
      queryClient.clear();
    },
    [queryClient],
  );

  // 401 em qualquer chamada com sessão ativa → sessão expirada → guardas levam ao login
  useEffect(() => {
    definirAoExpirarSessao(() => encerrar(true));
    return () => definirAoExpirarSessao(() => {});
  }, [encerrar]);

  const entrar = useCallback(async (username: string, senha?: string) => {
    const resposta = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { username, ...(senha ? { senha } : {}) },
    });
    const nova = { token: resposta.token, usuario: resposta.usuario };
    sessaoStorage.salvar(nova);
    setSessao(nova);
    setSessaoExpirada(false);
    return resposta.usuario;
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario: sessao?.usuario ?? null,
      sessaoExpirada,
      entrar,
      sair: () => encerrar(false),
    }),
    [sessao, sessaoExpirada, entrar, encerrar],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
