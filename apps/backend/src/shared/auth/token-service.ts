import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UnauthorizedError } from '../errors/app-error.js';
import type { AuthUser } from './auth-user.js';

const payloadSchema = z.object({
  sub: z.coerce.number().int().positive(),
  perfil: z.enum(['SECRETARIA', 'ALUNO']),
  alunoId: z.number().int().positive().nullable(),
});

export interface TokenService {
  sign(user: AuthUser): { token: string; expiresIn: number };
  verify(token: string): AuthUser;
}

/** Emite e valida JWTs assinados com HS256. */
export function createTokenService(options: {
  secret: string;
  expiresInSeconds: number;
}): TokenService {
  const { secret, expiresInSeconds } = options;

  return {
    sign(user) {
      const token = jwt.sign({ perfil: user.perfil, alunoId: user.alunoId }, secret, {
        subject: String(user.usuarioId),
        algorithm: 'HS256',
        expiresIn: expiresInSeconds,
      });
      return { token, expiresIn: expiresInSeconds };
    },

    verify(token) {
      let decoded: unknown;
      try {
        decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new UnauthorizedError(
            'TOKEN_EXPIRADO',
            'Sua sessão expirou. Faça login novamente.',
          );
        }
        throw new UnauthorizedError('TOKEN_INVALIDO', 'Token de acesso inválido.');
      }

      const payload = payloadSchema.safeParse(decoded);
      if (!payload.success) {
        throw new UnauthorizedError('TOKEN_INVALIDO', 'Token de acesso inválido.');
      }
      return {
        usuarioId: payload.data.sub,
        perfil: payload.data.perfil,
        alunoId: payload.data.alunoId,
      };
    },
  };
}
