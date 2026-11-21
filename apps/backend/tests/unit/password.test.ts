import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/shared/auth/password.js';

describe('hash de senha', () => {
  it('aceita a senha correta e recusa a errada', async () => {
    const hash = await hashPassword('senha-secreta');

    expect(await verifyPassword('senha-secreta', hash)).toBe(true);
    expect(await verifyPassword('senha-errada', hash)).toBe(false);
  });

  it('não armazena a senha em texto puro e usa salt aleatório', async () => {
    const a = await hashPassword('senha-secreta');
    const b = await hashPassword('senha-secreta');

    expect(a).not.toContain('senha-secreta');
    expect(a).not.toBe(b);
  });

  it('recusa hash em formato desconhecido', async () => {
    expect(await verifyPassword('qualquer', 'texto-sem-formato')).toBe(false);
  });
});
