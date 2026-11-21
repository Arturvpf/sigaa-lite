import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { errorHandler, notFoundHandler } from './shared/http/error-handler.js';

/**
 * Monta a aplicação Express sem iniciar o servidor HTTP,
 * o que permite testá-la com supertest.
 */
export function createApp(env: Pick<Env, 'CORS_ORIGIN'>): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
