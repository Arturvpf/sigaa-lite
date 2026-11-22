import { api } from './client';

export type Classificacao = 'OBRIGATORIA' | 'ELETIVA_PERFIL' | 'ELETIVA_LIVRE';

export interface DisciplinaResumo {
  id: number;
  codigo: string;
  nome: string;
  ch: number;
}

export interface Oferta {
  id: number;
  disciplina: DisciplinaResumo;
  professor: { id: number; nome: string };
  vagas: number;
  vagasOcupadas: number;
  vagasDisponiveis: number;
  lotada: boolean;
  classificacao: Classificacao;
  matriculaId: number | null;
  jaAprovado: boolean;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Matricula {
  id: number;
  criadaEm: string;
  turma: { id: number; disciplina: DisciplinaResumo; professor: { id: number; nome: string } };
  classificacao: Classificacao;
}

export interface ProgressoGrupo {
  grupo: Classificacao;
  chExigida: number;
  chIntegralizada: number;
  chEmCurso: number;
  chFaltante: number;
  percentual: number;
}

export interface Progresso {
  curso: { id: number; nome: string };
  grupos: ProgressoGrupo[];
}

export const ROTULO_CLASSIFICACAO: Record<Classificacao, string> = {
  OBRIGATORIA: 'Obrigatória',
  ELETIVA_PERFIL: 'Eletiva de perfil',
  ELETIVA_LIVRE: 'Eletiva livre',
};

export const TAMANHO_PAGINA_OFERTAS = 10;

/**
 * Chaves do cache do React Query. Tudo do aluno fica sob ['aluno'], então
 * depois de matricular ou cancelar basta invalidar ['aluno'] para atualizar
 * ofertas (vagas), matrículas e progresso de uma vez.
 */
export const chavesAluno = {
  tudo: ['aluno'] as const,
  ofertas: (busca: string, pagina: number) => ['aluno', 'ofertas', { busca, pagina }] as const,
  matriculas: ['aluno', 'matriculas'] as const,
  progresso: ['aluno', 'progresso'] as const,
};

export const alunoApi = {
  listarOfertas: (busca: string, pagina: number, signal?: AbortSignal) =>
    api<Pagina<Oferta>>('/aluno/ofertas', {
      query: { q: busca, page: pagina, pageSize: TAMANHO_PAGINA_OFERTAS },
      signal,
    }),

  matricular: (turmaId: number) =>
    api<{ id: number }>('/aluno/matriculas', { method: 'POST', body: { turmaId } }),

  listarMatriculas: (signal?: AbortSignal) => api<Matricula[]>('/aluno/matriculas', { signal }),

  cancelarMatricula: (matriculaId: number) =>
    api<void>(`/aluno/matriculas/${matriculaId}`, { method: 'DELETE' }),

  progresso: (signal?: AbortSignal) => api<Progresso>('/aluno/progresso', { signal }),
};
