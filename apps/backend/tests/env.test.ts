import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

describe('loadEnv', () => {
  it('aplica valores padrão quando as variáveis não são informadas', () => {
    const env = loadEnv({});

    expect(env.PORT).toBe(3333);
    expect(env.NODE_ENV).toBe('development');
  });

  it('falha com mensagem clara quando PORT é inválida', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });
});
