import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import type { PrismaClient } from './generated/prisma/client.js';
import { createAuthRoutes } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createUsuarioRepository } from './modules/auth/usuario.repository.js';
import { createTokenService } from './shared/auth/token-service.js';
import { errorHandler, notFoundHandler } from './shared/http/error-handler.js';

export interface AppDeps {
  env: Pick<Env, 'CORS_ORIGIN' | 'JWT_SECRET' | 'JWT_EXPIRES_IN_SECONDS'>;
  prisma: PrismaClient;
}

/**
 * Monta a aplicação Express sem iniciar o servidor HTTP, o que permite testá-la com supertest.
 * Também é a raiz de composição: cria repositórios, services e rotas e liga uns aos outros.
 */
export function createApp({ env, prisma }: AppDeps): Express {
  const tokens = createTokenService({
    secret: env.JWT_SECRET,
    expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
  });

  const authService = createAuthService({ usuarios: createUsuarioRepository(prisma), tokens });

  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/auth', createAuthRoutes({ service: authService, tokens }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
