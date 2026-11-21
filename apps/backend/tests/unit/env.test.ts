import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

const obrigatorias = {
  DATABASE_URL: 'postgresql://sigaa:sigaa@localhost:5432/sigaa',
  JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
};

describe('loadEnv', () => {
  it('aplica valores padrão quando as variáveis opcionais não são informadas', () => {
    const env = loadEnv(obrigatorias);

    expect(env.PORT).toBe(3333);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_EXPIRES_IN_SECONDS).toBe(3600);
  });

  it('falha com mensagem clara quando PORT é inválida', () => {
    expect(() => loadEnv({ ...obrigatorias, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('exige DATABASE_URL do PostgreSQL', () => {
    expect(() => loadEnv({ ...obrigatorias, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ ...obrigatorias, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('recusa JWT_SECRET curto demais', () => {
    expect(() => loadEnv({ ...obrigatorias, JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/);
  });
});
