import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Cria o client do Prisma usando o driver `pg` (adapter oficial do Prisma 7).
 * Recebe a URL por parâmetro para que testes possam apontar para outro banco.
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
