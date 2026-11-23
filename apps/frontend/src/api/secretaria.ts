import type { DisciplinaResumo, Pagina } from './aluno';
import { api } from './client';

export interface Disciplina extends DisciplinaResumo {
  /** Disciplinas que precisam estar aprovadas antes desta (requisito à escolha). */
  preRequisitos: { id: number; codigo: string; nome: string }[];
}

export interface Professor {
  id: number;
  nome: string;
  email: string;
}

export interface Turma {
  id: number;
  vagas: number;
  vagasOcupadas: number;
  vagasDisponiveis: number;
  disciplina: Disciplina;
  professor: { id: number; nome: string };
}

export interface DisciplinaForm {
  codigo: string;
  nome: string;
  ch: number;
}

export interface ProfessorForm {
  nome: string;
  email: string;
}

export interface TurmaForm {
  disciplinaId: number;
  professorId: number;
  vagas: number;
}

export const TAMANHO_PAGINA = 10;
/** Máximo permitido pela API; usado para carregar as opções dos selects de turma. */
export const TAMANHO_MAXIMO = 50;

/** Chaves de cache: tudo sob ['secretaria'], cada recurso com a sua. */
export const chavesSecretaria = {
  disciplinas: ['secretaria', 'disciplinas'] as const,
  professores: ['secretaria', 'professores'] as const,
  turmas: ['secretaria', 'turmas'] as const,
};

const listar =
  <T>(path: string) =>
  (busca: string, pagina: number, pageSize = TAMANHO_PAGINA, signal?: AbortSignal) =>
    api<Pagina<T>>(path, { query: { q: busca, page: pagina, pageSize }, signal });

export const secretariaApi = {
  listarDisciplinas: listar<Disciplina>('/secretaria/disciplinas'),
  criarDisciplina: (dados: DisciplinaForm) =>
    api<Disciplina>('/secretaria/disciplinas', { method: 'POST', body: dados }),
  atualizarDisciplina: (id: number, dados: DisciplinaForm) =>
    api<Disciplina>(`/secretaria/disciplinas/${id}`, { method: 'PUT', body: dados }),
  definirPreRequisitos: (id: number, preRequisitoIds: number[]) =>
    api<Disciplina>(`/secretaria/disciplinas/${id}/pre-requisitos`, {
      method: 'PUT',
      body: { preRequisitoIds },
    }),

  listarProfessores: listar<Professor>('/secretaria/professores'),
  criarProfessor: (dados: ProfessorForm) =>
    api<Professor>('/secretaria/professores', { method: 'POST', body: dados }),

  listarTurmas: listar<Turma>('/secretaria/turmas'),
  abrirTurma: (dados: TurmaForm) =>
    api<{ id: number }>('/secretaria/turmas', { method: 'POST', body: dados }),
  alterarVagas: (id: number, vagas: number) =>
    api<{ id: number; vagas: number; vagasOcupadas: number }>(`/secretaria/turmas/${id}/vagas`, {
      method: 'PATCH',
      body: { vagas },
    }),
};
