export type Perfil = 'SECRETARIA' | 'ALUNO';

export interface Usuario {
  id: number;
  username: string;
  perfil: Perfil;
  aluno: { id: number; nome: string; curso: { id: number; nome: string } } | null;
}

export interface Sessao {
  token: string;
  usuario: Usuario;
}

const CHAVE = 'sigaa-lite:sessao';

/**
 * Sessão guardada no localStorage, para sobreviver a um recarregamento da página.
 * O acesso fica em try/catch porque o storage pode estar bloqueado (modo privado,
 * política do navegador); nesse caso a sessão vale só enquanto a aba estiver aberta.
 */
export const sessaoStorage = {
  ler(): Sessao | null {
    try {
      const bruto = localStorage.getItem(CHAVE);
      return bruto ? (JSON.parse(bruto) as Sessao) : null;
    } catch {
      return null;
    }
  },

  salvar(sessao: Sessao) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(sessao));
    } catch {
      // storage indisponível: segue só em memória
    }
  },

  limpar() {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      // nada a limpar
    }
  },
};

/** Rota inicial de cada perfil depois do login. */
export function areaDoPerfil(perfil: Perfil): string {
  return perfil === 'ALUNO' ? '/aluno/ofertas' : '/secretaria/disciplinas';
}
