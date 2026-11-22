import { createContext, useContext } from 'react';
import type { Usuario } from './session';

export interface AuthContextValue {
  usuario: Usuario | null;
  /** A última sessão terminou porque o token expirou (mostrado na tela de login). */
  sessaoExpirada: boolean;
  entrar(username: string, senha?: string): Promise<Usuario>;
  sair(): void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return contexto;
}
