import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { DisciplinaInput, ProfessorInput, TurmaInput } from './secretaria.schemas.js';

type Db = PrismaClient | Prisma.TransactionClient;

interface Filtro {
  q?: string;
  skip: number;
  take: number;
}

const contem = (q: string) => ({ contains: q, mode: 'insensitive' as const });

const disciplinaSelect = { id: true, codigo: true, nome: true, ch: true } as const;

/** Disciplina com os seus pré-requisitos (código e nome), para a listagem da secretaria. */
const disciplinaComPreRequisitos = {
  ...disciplinaSelect,
  preRequisitos: {
    select: { preRequisito: { select: { id: true, codigo: true, nome: true } } },
    orderBy: { preRequisito: { codigo: 'asc' } },
  },
} as const;
const professorSelect = { id: true, nome: true, email: true } as const;

/** Consultas da secretaria. Sem regra de negócio. */
function consultas(db: Db) {
  return {
    async listarDisciplinas({ q, skip, take }: Filtro) {
      const where: Prisma.DisciplinaWhereInput = q
        ? { OR: [{ codigo: contem(q) }, { nome: contem(q) }] }
        : {};
      const [items, total] = await Promise.all([
        db.disciplina.findMany({
          where,
          skip,
          take,
          orderBy: { codigo: 'asc' },
          select: disciplinaComPreRequisitos,
        }),
        db.disciplina.count({ where }),
      ]);
      return { items, total };
    },

    buscarDisciplina(id: number) {
      return db.disciplina.findUnique({ where: { id }, select: disciplinaComPreRequisitos });
    },

    async contarDisciplinasExistentes(ids: number[]) {
      return db.disciplina.count({ where: { id: { in: ids } } });
    },

    /**
     * Serializa as alterações de pré-requisitos: duas secretarias editando ao mesmo tempo
     * poderiam, cada uma, criar metade de um ciclo (A exige B / B exige A) sem enxergar a outra.
     * Leituras continuam liberadas.
     */
    async travarPreRequisitos() {
      await db.$executeRaw`LOCK TABLE pre_requisitos IN SHARE ROW EXCLUSIVE MODE`;
    },

    listarArestasPreRequisitos() {
      return db.preRequisito.findMany({ select: { disciplinaId: true, preRequisitoId: true } });
    },

    async substituirPreRequisitos(disciplinaId: number, preRequisitoIds: number[]) {
      await db.preRequisito.deleteMany({ where: { disciplinaId } });
      if (preRequisitoIds.length > 0) {
        await db.preRequisito.createMany({
          data: preRequisitoIds.map((preRequisitoId) => ({ disciplinaId, preRequisitoId })),
        });
      }
    },

    criarDisciplina(dados: DisciplinaInput) {
      return db.disciplina.create({ data: dados, select: disciplinaComPreRequisitos });
    },

    atualizarDisciplina(id: number, dados: DisciplinaInput) {
      return db.disciplina.update({
        where: { id },
        data: dados,
        select: disciplinaComPreRequisitos,
      });
    },

    async listarProfessores({ q, skip, take }: Filtro) {
      const where: Prisma.ProfessorWhereInput = q
        ? { OR: [{ nome: contem(q) }, { email: contem(q) }] }
        : {};
      const [items, total] = await Promise.all([
        db.professor.findMany({
          where,
          skip,
          take,
          orderBy: { nome: 'asc' },
          select: professorSelect,
        }),
        db.professor.count({ where }),
      ]);
      return { items, total };
    },

    buscarProfessor(id: number) {
      return db.professor.findUnique({ where: { id }, select: professorSelect });
    },

    criarProfessor(dados: ProfessorInput) {
      return db.professor.create({ data: dados, select: professorSelect });
    },

    async listarTurmas({ q, skip, take }: Filtro) {
      const where: Prisma.TurmaWhereInput = q
        ? {
            OR: [
              { disciplina: { OR: [{ codigo: contem(q) }, { nome: contem(q) }] } },
              { professor: { nome: contem(q) } },
            ],
          }
        : {};
      const [turmas, total] = await Promise.all([
        db.turma.findMany({
          where,
          skip,
          take,
          orderBy: [{ disciplina: { codigo: 'asc' } }, { id: 'asc' }],
          select: {
            id: true,
            vagas: true,
            disciplina: { select: disciplinaSelect },
            professor: { select: { id: true, nome: true } },
            _count: { select: { matriculas: { where: { situacao: 'ATIVA' } } } },
          },
        }),
        db.turma.count({ where }),
      ]);
      return { turmas, total };
    },

    criarTurma(dados: TurmaInput) {
      return db.turma.create({ data: dados, select: { id: true } });
    },

    /** Trava a turma até o fim da transação (mesmo lock usado na matrícula). */
    async travarTurma(id: number) {
      const linhas = await db.$queryRaw<{ id: number; vagas: number }[]>`
        SELECT id, vagas FROM turmas WHERE id = ${id} FOR UPDATE
      `;
      return linhas[0] ?? null;
    },

    contarMatriculasAtivas(turmaId: number) {
      return db.matricula.count({ where: { turmaId, situacao: 'ATIVA' } });
    },

    atualizarVagas(id: number, vagas: number) {
      return db.turma.update({ where: { id }, data: { vagas }, select: { id: true } });
    },
  };
}

export function createSecretariaRepository(prisma: PrismaClient) {
  return {
    ...consultas(prisma),
    transacao<T>(fn: (repo: ReturnType<typeof consultas>) => Promise<T>): Promise<T> {
      return prisma.$transaction((tx) => fn(consultas(tx)));
    },
  };
}

export type SecretariaRepository = ReturnType<typeof createSecretariaRepository>;
