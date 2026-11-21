import type { Request, RequestHandler } from 'express';
import type { Perfil } from '../../generated/prisma/client.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';
import type { AuthUser } from './auth-user.js';
import type { TokenService } from './token-service.js';

/**
 * Exige um token válido no cabeçalho `Authorization: Bearer <token>`.
 * 401 quando ausente, inválido ou expirado.
 */
export function authenticate(tokens: TokenService): RequestHandler {
  return (req, _res, next) => {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('TOKEN_AUSENTE', 'Autenticação necessária.');
    }
    req.auth = tokens.verify(token);
    next();
  };
}

/** Exige um dos perfis informados. 403 quando o perfil não tem acesso. */
export function requirePerfil(...perfis: Perfil[]): RequestHandler {
  return (req, _res, next) => {
    const user = getAuthUser(req);
    if (!perfis.includes(user.perfil)) throw new ForbiddenError();
    next();
  };
}

/** Usuário autenticado da requisição (use após `authenticate`). */
export function getAuthUser(req: Request): AuthUser {
  if (!req.auth) throw new UnauthorizedError('TOKEN_AUSENTE', 'Autenticação necessária.');
  return req.auth;
}

/** Id do aluno logado, sempre vindo do token (regra 9). */
export function getAlunoId(req: Request): number {
  const { alunoId } = getAuthUser(req);
  if (alunoId === null) throw new ForbiddenError();
  return alunoId;
}
