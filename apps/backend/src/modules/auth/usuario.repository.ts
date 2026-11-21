import type { PrismaClient } from '../../generated/prisma/client.js';

const usuarioComAluno = {
  aluno: { select: { id: true, nome: true, curso: { select: { id: true, nome: true } } } },
} as const;

export type UsuarioComAluno = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createUsuarioRepository>['findByUsername']>>
>;

/** Acesso a dados de usuários. Sem regra de negócio: só consultas. */
export function createUsuarioRepository(prisma: PrismaClient) {
  return {
    findByUsername(username: string) {
      return prisma.usuario.findUnique({ where: { username }, include: usuarioComAluno });
    },

    findById(id: number) {
      return prisma.usuario.findUnique({ where: { id }, include: usuarioComAluno });
    },
  };
}

export type UsuarioRepository = ReturnType<typeof createUsuarioRepository>;
