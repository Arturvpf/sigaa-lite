import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

const DATABASE_URL = 'postgresql://sigaa:sigaa@localhost:5432/sigaa';

describe('loadEnv', () => {
  it('aplica valores padrão quando as variáveis opcionais não são informadas', () => {
    const env = loadEnv({ DATABASE_URL });

    expect(env.PORT).toBe(3333);
    expect(env.NODE_ENV).toBe('development');
  });

  it('falha com mensagem clara quando PORT é inválida', () => {
    expect(() => loadEnv({ DATABASE_URL, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('exige DATABASE_URL do PostgreSQL', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ DATABASE_URL: 'mysql://localhost/db' })).toThrow(/DATABASE_URL/);
  });
});
