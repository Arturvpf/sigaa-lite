import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createPrismaClient } from './database/prisma.js';

const env = loadEnv();
const prisma = createPrismaClient(env.DATABASE_URL);
const app = createApp({ env, prisma });

const server = app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
});

// Encerramento limpo: para de aceitar conexões e fecha o pool do banco
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
