import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    projects: [
      {
        // Testes unitários: rápidos, sem banco
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] },
      },
      {
        // Testes de integração: API + PostgreSQL real no banco isolado `sigaa_test`
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          // Os arquivos compartilham o mesmo banco, então rodam um de cada vez
          fileParallelism: false,
        },
      },
    ],
  },
});
