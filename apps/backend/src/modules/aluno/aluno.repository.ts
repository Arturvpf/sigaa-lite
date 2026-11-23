import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

type Db = PrismaClient | Prisma.TransactionClient;

const disciplinaResumo = { select: { id: true, codigo: true, nome: true, ch: true } } as const;
const professorResumo = { select: { id: true, nome: true } } as const;

/** Consultas usadas pelo fluxo do aluno. Sem regra de negócio. */
function consultas(db: Db) {
  return {
    /** Aluno com o curso (CH exigida) e a estrutura curricular. */
    buscarContexto(alunoId: number) {
      return db.aluno.findUnique({
        where: { id: alunoId },
        select: {
          id: true,
          curso: {
            select: {
              id: true,
              nome: true,
              chObrigatoria: true,
              chEletivaPerfil: true,
              chEletivaLivre: true,
              estrutura: { select: { disciplinaId: true, tipo: true } },
            },
          },
        },
      });
    },

    /** Turmas do semestre com busca por código/nome da disciplina e vagas ocupadas. */
    async listarTurmas(filtro: { q?: string; skip: number; take: number }) {
      const where: Prisma.TurmaWhereInput = filtro.q
        ? {
            disciplina: {
              OR: [
                { codigo: { contains: filtro.q, mode: 'insensitive' } },
                { nome: { contains: filtro.q, mode: 'insensitive' } },
              ],
            },
          }
        : {};

      const [turmas, total] = await Promise.all([
        db.turma.findMany({
          where,
          skip: filtro.skip,
          take: filtro.take,
          orderBy: [{ disciplina: { codigo: 'asc' } }, { id: 'asc' }],
          select: {
            id: true,
            vagas: true,
            disciplina: {
              select: {
                ...disciplinaResumo.select,
                preRequisitos: {
                  select: { preRequisito: { select: { id: true, codigo: true, nome: true } } },
                  orderBy: { preRequisito: { codigo: 'asc' } },
                },
              },
            },
            professor: professorResumo,
            _count: { select: { matriculas: { where: { situacao: 'ATIVA' } } } },
          },
        }),
        db.turma.count({ where }),
      ]);
      return { turmas, total };
    },

    /** Disciplinas aprovadas no histórico, com a CH de cada uma. */
    listarAprovadas(alunoId: number) {
      return db.historicoItem.findMany({
        where: { alunoId, situacao: 'APROVADO' },
        select: { disciplina: { select: { id: true, ch: true } } },
      });
    },

    /** Matrículas ativas do aluno, com turma, disciplina e professor. */
    listarMatriculasAtivas(alunoId: number) {
      return db.matricula.findMany({
        where: { alunoId, situacao: 'ATIVA' },
        orderBy: { turma: { disciplina: { codigo: 'asc' } } },
        select: {
          id: true,
          criadaEm: true,
          turma: {
            select: { id: true, disciplina: disciplinaResumo, professor: professorResumo },
          },
        },
      });
    },

    /**
     * Trava a linha da turma até o fim da transação (SELECT ... FOR UPDATE).
     * Duas matrículas simultâneas na mesma turma passam a ser feitas uma de cada vez,
     * então a contagem de vagas feita em seguida é confiável.
     */
    async travarTurma(turmaId: number) {
      const linhas = await db.$queryRaw<{ id: number; vagas: number; disciplinaId: number }[]>`
        SELECT id, vagas, disciplina_id AS "disciplinaId"
        FROM turmas
        WHERE id = ${turmaId}
        FOR UPDATE
      `;
      return linhas[0] ?? null;
    },

    contarMatriculasAtivas(turmaId: number) {
      return db.matricula.count({ where: { turmaId, situacao: 'ATIVA' } });
    },

    async foiAprovado(alunoId: number, disciplinaId: number) {
      const aprovacao = await db.historicoItem.findFirst({
        where: { alunoId, disciplinaId, situacao: 'APROVADO' },
        select: { id: true },
      });
      return aprovacao !== null;
    },

    /**
     * Pré-requisitos da disciplina que o aluno ainda NÃO tem aprovados no histórico.
     * Reprovação e matrícula em curso não contam como atendido.
     */
    async listarPreRequisitosPendentes(alunoId: number, disciplinaId: number) {
      const pendentes = await db.preRequisito.findMany({
        where: {
          disciplinaId,
          preRequisito: { historico: { none: { alunoId, situacao: 'APROVADO' } } },
        },
        select: { preRequisito: { select: { id: true, codigo: true, nome: true } } },
        orderBy: { preRequisito: { codigo: 'asc' } },
      });
      return pendentes.map((p) => p.preRequisito);
    },

    /** Matrícula ativa do aluno em qualquer turma da disciplina. */
    buscarMatriculaAtivaNaDisciplina(alunoId: number, disciplinaId: number) {
      return db.matricula.findFirst({
        where: { alunoId, situacao: 'ATIVA', turma: { disciplinaId } },
        select: { id: true, turmaId: true },
      });
    },

    criarMatricula(alunoId: number, turmaId: number) {
      return db.matricula.create({ data: { alunoId, turmaId }, select: { id: true } });
    },

    /** Busca a matrícula somente entre as do próprio aluno (regra 9). */
    buscarMatriculaDoAluno(alunoId: number, matriculaId: number) {
      return db.matricula.findFirst({
        where: { id: matriculaId, alunoId },
        select: { id: true, situacao: true },
      });
    },

    /**
     * Cancela apenas se ainda estiver ativa (update condicional).
     * Retorna false se outra requisição cancelou antes.
     */
    async cancelarMatricula(matriculaId: number) {
      const { count } = await db.matricula.updateMany({
        where: { id: matriculaId, situacao: 'ATIVA' },
        data: { situacao: 'CANCELADA', canceladaEm: new Date() },
      });
      return count === 1;
    },
  };
}

export function createAlunoRepository(prisma: PrismaClient) {
  return {
    ...consultas(prisma),
    /** Executa `fn` numa transação, com as mesmas consultas ligadas a ela. */
    transacao<T>(fn: (repo: ReturnType<typeof consultas>) => Promise<T>): Promise<T> {
      return prisma.$transaction((tx) => fn(consultas(tx)));
    },
  };
}

export type AlunoRepository = ReturnType<typeof createAlunoRepository>;
