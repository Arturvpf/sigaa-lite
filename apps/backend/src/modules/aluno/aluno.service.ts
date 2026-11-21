import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors/app-error.js';
import { buildPage, type PaginationQuery, toSkipTake } from '../../shared/http/pagination.js';
import type { AlunoRepository } from './aluno.repository.js';
import { type Classificacao, classificar, type EstruturaCurso } from './classificacao.js';
import { calcularProgresso } from './progresso.js';

interface DisciplinaResumo {
  id: number;
  codigo: string;
  nome: string;
  ch: number;
}

export interface OfertaDTO {
  id: number;
  disciplina: DisciplinaResumo;
  professor: { id: number; nome: string };
  vagas: number;
  vagasOcupadas: number;
  vagasDisponiveis: number;
  lotada: boolean;
  /** Como a disciplina conta para o curso do aluno logado (regra 10). */
  classificacao: Classificacao;
  /** Id da matrícula ativa do aluno nesta turma, se houver. */
  matriculaId: number | null;
  /** O aluno já foi aprovado nesta disciplina (não pode se matricular — regra 7). */
  jaAprovado: boolean;
}

export interface MatriculaDTO {
  id: number;
  criadaEm: Date;
  turma: { id: number; disciplina: DisciplinaResumo; professor: { id: number; nome: string } };
  classificacao: Classificacao;
}

export function createAlunoService(deps: { repo: AlunoRepository }) {
  const { repo } = deps;

  /** Curso e estrutura do aluno logado. */
  async function contexto(alunoId: number) {
    const aluno = await repo.buscarContexto(alunoId);
    // Token válido de um aluno que não existe mais: a sessão deixa de valer
    if (!aluno) throw new UnauthorizedError('TOKEN_INVALIDO', 'Aluno não encontrado.');
    const estrutura: EstruturaCurso = new Map(
      aluno.curso.estrutura.map((e) => [e.disciplinaId, e.tipo]),
    );
    return { curso: aluno.curso, estrutura };
  }

  return {
    async listarOfertas(alunoId: number, query: PaginationQuery) {
      const [{ estrutura }, { turmas, total }, aprovadas, matriculas] = await Promise.all([
        contexto(alunoId),
        repo.listarTurmas({ q: query.q, ...toSkipTake(query) }),
        repo.listarAprovadas(alunoId),
        repo.listarMatriculasAtivas(alunoId),
      ]);

      const disciplinasAprovadas = new Set(aprovadas.map((a) => a.disciplina.id));
      const matriculaPorTurma = new Map(matriculas.map((m) => [m.turma.id, m.id]));

      const items: OfertaDTO[] = turmas.map((turma) => {
        const vagasOcupadas = turma._count.matriculas;
        const vagasDisponiveis = Math.max(0, turma.vagas - vagasOcupadas);
        return {
          id: turma.id,
          disciplina: turma.disciplina,
          professor: turma.professor,
          vagas: turma.vagas,
          vagasOcupadas,
          vagasDisponiveis,
          lotada: vagasDisponiveis === 0,
          classificacao: classificar(turma.disciplina.id, estrutura),
          matriculaId: matriculaPorTurma.get(turma.id) ?? null,
          jaAprovado: disciplinasAprovadas.has(turma.disciplina.id),
        };
      });

      return buildPage(items, total, query);
    },

    async listarMatriculas(alunoId: number): Promise<MatriculaDTO[]> {
      const [{ estrutura }, matriculas] = await Promise.all([
        contexto(alunoId),
        repo.listarMatriculasAtivas(alunoId),
      ]);
      return matriculas.map((m) => ({
        ...m,
        classificacao: classificar(m.turma.disciplina.id, estrutura),
      }));
    },

    /**
     * Matricula o aluno numa turma (regras 6 e 7).
     * Tudo acontece numa transação com a turma travada, para que duas matrículas
     * simultâneas não ocupem a mesma última vaga.
     */
    async matricular(alunoId: number, turmaId: number) {
      await contexto(alunoId);

      return repo.transacao(async (tx) => {
        const turma = await tx.travarTurma(turmaId);
        if (!turma) throw new NotFoundError('TURMA_NAO_ENCONTRADA', 'Turma não encontrada.');

        if (await tx.foiAprovado(alunoId, turma.disciplinaId)) {
          throw new BusinessRuleError(
            'DISCIPLINA_JA_APROVADA',
            'Você já foi aprovado nesta disciplina.',
          );
        }

        const matriculaExistente = await tx.buscarMatriculaAtivaNaDisciplina(
          alunoId,
          turma.disciplinaId,
        );
        if (matriculaExistente?.turmaId === turmaId) {
          throw new ConflictError('JA_MATRICULADO_NA_TURMA', 'Você já está matriculado nesta turma.');
        }
        if (matriculaExistente) {
          throw new BusinessRuleError(
            'JA_MATRICULADO_NA_DISCIPLINA',
            'Você já está matriculado em outra turma desta disciplina.',
          );
        }

        if ((await tx.contarMatriculasAtivas(turmaId)) >= turma.vagas) {
          throw new BusinessRuleError('TURMA_LOTADA', 'Esta turma não tem mais vagas disponíveis.');
        }

        return tx.criarMatricula(alunoId, turmaId);
      });
    },

    /** Cancela uma matrícula ativa do próprio aluno; a vaga volta para a turma (regras 8 e 9). */
    async cancelarMatricula(alunoId: number, matriculaId: number) {
      const matricula = await repo.buscarMatriculaDoAluno(alunoId, matriculaId);
      // Matrícula de outro aluno responde igual a inexistente: não revela que ela existe
      if (!matricula) {
        throw new NotFoundError('MATRICULA_NAO_ENCONTRADA', 'Matrícula não encontrada.');
      }

      const cancelada =
        matricula.situacao === 'ATIVA' && (await repo.cancelarMatricula(matriculaId));
      if (!cancelada) {
        throw new BusinessRuleError('MATRICULA_JA_CANCELADA', 'Esta matrícula já foi cancelada.');
      }
    },

    async progresso(alunoId: number) {
      const [{ curso, estrutura }, aprovadas, matriculas] = await Promise.all([
        contexto(alunoId),
        repo.listarAprovadas(alunoId),
        repo.listarMatriculasAtivas(alunoId),
      ]);

      const grupos = calcularProgresso({
        chExigida: curso,
        estrutura,
        aprovadas: aprovadas.map(({ disciplina }) => ({
          disciplinaId: disciplina.id,
          ch: disciplina.ch,
        })),
        emCurso: matriculas.map(({ turma }) => ({
          disciplinaId: turma.disciplina.id,
          ch: turma.disciplina.ch,
        })),
      });

      return { curso: { id: curso.id, nome: curso.nome }, grupos };
    },
  };
}

export type AlunoService = ReturnType<typeof createAlunoService>;
