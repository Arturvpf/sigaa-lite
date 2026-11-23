import { Prisma } from '../../generated/prisma/client.js';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { buildPage, type PaginationQuery, toSkipTake } from '../../shared/http/pagination.js';
import { criariaCiclo } from './pre-requisitos.js';
import type { SecretariaRepository } from './secretaria.repository.js';
import type { DisciplinaInput, ProfessorInput, TurmaInput } from './secretaria.schemas.js';

/** Violação de UNIQUE no banco (código, e-mail). */
function isDuplicado(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Registro alvo de update inexistente. */
function isInexistente(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

const codigoDuplicado = (codigo: string) =>
  new ConflictError('CODIGO_DUPLICADO', `Já existe uma disciplina com o código ${codigo}.`);

const disciplinaNaoEncontrada = () =>
  new NotFoundError('DISCIPLINA_NAO_ENCONTRADA', 'Disciplina não encontrada.');

type DisciplinaDoBanco = {
  id: number;
  codigo: string;
  nome: string;
  ch: number;
  preRequisitos: { preRequisito: { id: number; codigo: string; nome: string } }[];
};

/** Formato da API: pré-requisitos como lista simples de { id, codigo, nome }. */
function paraDisciplinaDTO({ preRequisitos, ...disciplina }: DisciplinaDoBanco) {
  return { ...disciplina, preRequisitos: preRequisitos.map((p) => p.preRequisito) };
}

export function createSecretariaService(deps: { repo: SecretariaRepository }) {
  const { repo } = deps;

  return {
    // --- Disciplinas (regras 1 e 2) ---------------------------------------

    async listarDisciplinas(query: PaginationQuery) {
      const { items, total } = await repo.listarDisciplinas({ q: query.q, ...toSkipTake(query) });
      return buildPage(items.map(paraDisciplinaDTO), total, query);
    },

    async buscarDisciplina(id: number) {
      const disciplina = await repo.buscarDisciplina(id);
      if (!disciplina) throw disciplinaNaoEncontrada();
      return paraDisciplinaDTO(disciplina);
    },

    /**
     * Regra 1 (código único) é garantida pelo UNIQUE do banco: em vez de consultar antes e
     * depois inserir (o que deixaria uma janela para duas requisições simultâneas), tenta
     * inserir e traduz a violação em 409. A regra 2 (CH) já foi validada no schema.
     */
    async criarDisciplina(dados: DisciplinaInput) {
      try {
        return paraDisciplinaDTO(await repo.criarDisciplina(dados));
      } catch (error) {
        if (isDuplicado(error)) throw codigoDuplicado(dados.codigo);
        throw error;
      }
    },

    /** O código pode ser editado (ex.: corrigir um erro de digitação), desde que continue único. */
    async atualizarDisciplina(id: number, dados: DisciplinaInput) {
      try {
        return paraDisciplinaDTO(await repo.atualizarDisciplina(id, dados));
      } catch (error) {
        if (isDuplicado(error)) throw codigoDuplicado(dados.codigo);
        if (isInexistente(error)) throw disciplinaNaoEncontrada();
        throw error;
      }
    },

    /**
     * Requisito à escolha: substitui os pré-requisitos da disciplina.
     * Recusa a própria disciplina, disciplinas inexistentes e qualquer ciclo.
     */
    async definirPreRequisitos(disciplinaId: number, preRequisitoIds: number[]) {
      if (!(await repo.buscarDisciplina(disciplinaId))) throw disciplinaNaoEncontrada();

      if (preRequisitoIds.includes(disciplinaId)) {
        throw new BusinessRuleError(
          'PRE_REQUISITO_INVALIDO',
          'Uma disciplina não pode ser pré-requisito de si mesma.',
        );
      }
      if ((await repo.contarDisciplinasExistentes(preRequisitoIds)) !== preRequisitoIds.length) {
        throw new BusinessRuleError(
          'PRE_REQUISITO_INEXISTENTE',
          'Algum dos pré-requisitos informados não existe.',
        );
      }

      await repo.transacao(async (tx) => {
        await tx.travarPreRequisitos();
        const arestas = await tx.listarArestasPreRequisitos();
        if (criariaCiclo(arestas, disciplinaId, preRequisitoIds)) {
          throw new BusinessRuleError(
            'PRE_REQUISITO_CICLICO',
            'Esses pré-requisitos criariam um ciclo: a disciplina acabaria exigindo a si mesma, ' +
              'direta ou indiretamente.',
          );
        }
        await tx.substituirPreRequisitos(disciplinaId, preRequisitoIds);
      });

      return paraDisciplinaDTO((await repo.buscarDisciplina(disciplinaId))!);
    },

    // --- Professores (regra 3) --------------------------------------------

    async listarProfessores(query: PaginationQuery) {
      const { items, total } = await repo.listarProfessores({ q: query.q, ...toSkipTake(query) });
      return buildPage(items, total, query);
    },

    async criarProfessor(dados: ProfessorInput) {
      try {
        return await repo.criarProfessor(dados);
      } catch (error) {
        if (isDuplicado(error)) {
          throw new ConflictError(
            'EMAIL_DUPLICADO',
            `Já existe um professor com o e-mail ${dados.email}.`,
          );
        }
        throw error;
      }
    },

    // --- Turmas (regras 4 e 5) --------------------------------------------

    async listarTurmas(query: PaginationQuery) {
      const { turmas, total } = await repo.listarTurmas({ q: query.q, ...toSkipTake(query) });
      const items = turmas.map(({ _count, ...turma }) => ({
        ...turma,
        vagasOcupadas: _count.matriculas,
        vagasDisponiveis: Math.max(0, turma.vagas - _count.matriculas),
      }));
      return buildPage(items, total, query);
    },

    /** Regra 4: disciplina e professor precisam existir; vagas >= 1 já validado no schema. */
    async abrirTurma(dados: TurmaInput) {
      const [disciplina, professor] = await Promise.all([
        repo.buscarDisciplina(dados.disciplinaId),
        repo.buscarProfessor(dados.professorId),
      ]);
      if (!disciplina) {
        throw new BusinessRuleError('DISCIPLINA_INEXISTENTE', 'A disciplina informada não existe.');
      }
      if (!professor) {
        throw new BusinessRuleError('PROFESSOR_INEXISTENTE', 'O professor informado não existe.');
      }
      return repo.criarTurma(dados);
    },

    /**
     * Regra 5: as vagas nunca ficam abaixo do número de matriculados.
     * A turma é travada (mesmo lock da matrícula), então nenhuma matrícula nova entra
     * entre a contagem e a atualização.
     */
    async alterarVagas(turmaId: number, vagas: number) {
      return repo.transacao(async (tx) => {
        const turma = await tx.travarTurma(turmaId);
        if (!turma) throw new NotFoundError('TURMA_NAO_ENCONTRADA', 'Turma não encontrada.');

        const matriculados = await tx.contarMatriculasAtivas(turmaId);
        if (vagas < matriculados) {
          throw new BusinessRuleError(
            'VAGAS_ABAIXO_DOS_MATRICULADOS',
            `A turma já tem ${matriculados} aluno(s) matriculado(s); as vagas não podem ficar abaixo disso.`,
            { matriculados },
          );
        }
        await tx.atualizarVagas(turmaId, vagas);
        return { id: turmaId, vagas, vagasOcupadas: matriculados };
      });
    },
  };
}

export type SecretariaService = ReturnType<typeof createSecretariaService>;
