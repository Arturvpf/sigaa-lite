import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { createPrismaClient } from '../../src/database/prisma.js';
import type {
  PrismaClient,
  SituacaoHistorico,
  TipoDisciplina,
} from '../../src/generated/prisma/client.js';
import { hashPassword } from '../../src/shared/auth/password.js';
import { TEST_DATABASE_URL, testEnv } from './test-env.js';

/**
 * Prepara um arquivo de teste de integração: app real ligada ao banco de teste,
 * com o banco limpo antes de cada teste.
 */
export function setupIntegration() {
  const prisma = createPrismaClient(TEST_DATABASE_URL);
  const app = createApp({ env: testEnv, prisma });

  beforeEach(() => limparBanco(prisma));
  afterAll(() => prisma.$disconnect());

  return { prisma, app, fabrica: criarFabrica(prisma) };
}

async function limparBanco(prisma: PrismaClient) {
  await prisma.$executeRaw`
    TRUNCATE TABLE matriculas, historico_itens, turmas, alunos, estruturas_curriculares,
                   pre_requisitos, professores, disciplinas, cursos, usuarios
    RESTART IDENTITY CASCADE
  `;
}

/** Atalhos para criar só os dados que cada teste precisa. */
function criarFabrica(prisma: PrismaClient) {
  return {
    async curso(nome = 'Ciência da Computação') {
      return prisma.curso.create({
        data: { nome, chObrigatoria: 360, chEletivaPerfil: 120, chEletivaLivre: 60 },
      });
    },

    async secretaria(username = 'secretaria', senha?: string) {
      return prisma.usuario.create({
        data: {
          username,
          perfil: 'SECRETARIA',
          senhaHash: senha ? await hashPassword(senha) : null,
        },
      });
    },

    async aluno(username: string, cursoId: number, nome = `Aluno ${username}`) {
      return prisma.aluno.create({
        data: {
          nome,
          curso: { connect: { id: cursoId } },
          usuario: { create: { username, perfil: 'ALUNO' } },
        },
        include: { usuario: true },
      });
    },

    async disciplina(codigo: string, ch = 60, nome = `Disciplina ${codigo}`) {
      return prisma.disciplina.create({ data: { codigo, nome, ch } });
    },

    /** `disciplinaId` exige `preRequisitoId`. */
    async preRequisito(disciplinaId: number, preRequisitoId: number) {
      return prisma.preRequisito.create({ data: { disciplinaId, preRequisitoId } });
    },

    async naEstrutura(cursoId: number, disciplinaId: number, tipo: TipoDisciplina) {
      return prisma.estruturaCurricular.create({ data: { cursoId, disciplinaId, tipo } });
    },

    async professor(email = `prof${++sequencia}@exemplo.edu.br`, nome = 'Professor Teste') {
      return prisma.professor.create({ data: { nome, email } });
    },

    async turma(disciplinaId: number, vagas = 30) {
      const professor = await this.professor();
      return prisma.turma.create({ data: { disciplinaId, professorId: professor.id, vagas } });
    },

    async historico(
      alunoId: number,
      disciplinaId: number,
      situacao: SituacaoHistorico,
      semestre = '2025.1',
    ) {
      return prisma.historicoItem.create({ data: { alunoId, disciplinaId, situacao, semestre } });
    },

    async matricula(alunoId: number, turmaId: number) {
      return prisma.matricula.create({ data: { alunoId, turmaId } });
    },
  };
}

let sequencia = 0;

/** Faz login pela API e devolve o token, como o front-end faria. */
export async function tokenDe(app: Express, username: string): Promise<string> {
  const res = await request(app).post('/auth/login').send({ username });
  if (res.status !== 200) throw new Error(`Login de ${username} falhou: ${res.status}`);
  return res.body.token;
}
