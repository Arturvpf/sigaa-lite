import { afterAll, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { createPrismaClient } from '../../src/database/prisma.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
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
                   professores, disciplinas, cursos, usuarios
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
  };
}
