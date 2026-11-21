import { Router } from 'express';
import { authenticate } from '../../shared/auth/middlewares.js';
import type { TokenService } from '../../shared/auth/token-service.js';
import { createAuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

export function createAuthRoutes(deps: { service: AuthService; tokens: TokenService }): Router {
  const controller = createAuthController(deps.service);
  const router = Router();

  router.post('/login', controller.login);
  router.get('/me', authenticate(deps.tokens), controller.me);

  return router;
}
