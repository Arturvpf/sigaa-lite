import 'dotenv/config';

/**
 * Configuração dos testes de integração. Usa sempre um banco separado do de desenvolvimento,
 * porque cada teste apaga e recria os dados que precisa.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://sigaa:sigaa@localhost:5432/sigaa_test';

// Proteção contra apagar o banco de desenvolvimento por engano
if (!new URL(TEST_DATABASE_URL).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL deve apontar para um banco cujo nome termina em "_test".');
}

export const testEnv = {
  CORS_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
  JWT_EXPIRES_IN_SECONDS: 3600,
};
