import cors from 'cors';
import express, { type Express } from 'express';
import type { Env } from './config/env.js';

/**
 * Monta a aplicação Express sem iniciar o servidor HTTP,
 * o que permite testá-la com supertest.
 */
export function createApp(env: Pick<Env, 'CORS_ORIGIN'>): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
