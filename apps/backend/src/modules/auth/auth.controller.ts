import type { RequestHandler } from 'express';
import { getAuthUser } from '../../shared/auth/middlewares.js';
import { parse } from '../../shared/http/validate.js';
import { loginSchema } from './auth.schemas.js';
import type { AuthService } from './auth.service.js';

/** Controller: traduz HTTP ⇄ service. Valida a entrada e não contém regra de negócio. */
export function createAuthController(service: AuthService) {
  const login: RequestHandler = async (req, res) => {
    const input = parse(loginSchema, req.body);
    res.json(await service.login(input));
  };

  const me: RequestHandler = async (req, res) => {
    res.json(await service.me(getAuthUser(req).usuarioId));
  };

  return { login, me };
}
