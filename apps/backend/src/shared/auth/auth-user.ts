import type { Perfil } from '../../generated/prisma/client.js';

/**
 * Usuário autenticado, extraído do token.
 * `alunoId` só existe para o perfil ALUNO e é a única fonte do aluno nas rotas
 * do aluno — nunca o corpo nem a URL (regra 9).
 */
export interface AuthUser {
  usuarioId: number;
  perfil: Perfil;
  alunoId: number | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}
