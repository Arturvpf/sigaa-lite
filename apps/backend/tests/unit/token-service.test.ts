import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../src/shared/auth/auth-user.js';
import { createTokenService } from '../../src/shared/auth/token-service.js';
import { UnauthorizedError } from '../../src/shared/errors/app-error.js';

const secret = 'segredo-de-teste-com-pelo-menos-32-caracteres';
const tokens = createTokenService({ secret, expiresInSeconds: 3600 });
const aluno: AuthUser = { usuarioId: 7, perfil: 'ALUNO', alunoId: 3 };

function erroDe(fn: () => unknown): UnauthorizedError {
  try {
    fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) return error;
    throw error;
  }
  throw new Error('era esperado um UnauthorizedError');
}

describe('TokenService', () => {
  it('devolve o mesmo usuário que foi assinado', () => {
    const { token, expiresIn } = tokens.sign(aluno);

    expect(expiresIn).toBe(3600);
    expect(tokens.verify(token)).toEqual(aluno);
  });

  it('mantém alunoId nulo para a secretaria', () => {
    const secretaria: AuthUser = { usuarioId: 1, perfil: 'SECRETARIA', alunoId: null };

    expect(tokens.verify(tokens.sign(secretaria).token)).toEqual(secretaria);
  });

  it('recusa token expirado com código TOKEN_EXPIRADO', () => {
    const expirado = jwt.sign(
      { perfil: 'ALUNO', alunoId: 3, exp: Math.floor(Date.now() / 1000) - 60 },
      secret,
      { subject: '7' },
    );

    expect(erroDe(() => tokens.verify(expirado)).code).toBe('TOKEN_EXPIRADO');
  });

  it('recusa token assinado com outro segredo', () => {
    const outro = createTokenService({ secret: 'x'.repeat(40), expiresInSeconds: 3600 });

    expect(erroDe(() => tokens.verify(outro.sign(aluno).token)).code).toBe('TOKEN_INVALIDO');
  });

  it('recusa token adulterado ou com conteúdo inesperado', () => {
    const semPerfil = jwt.sign({ alunoId: 3 }, secret, { subject: '7' });

    expect(erroDe(() => tokens.verify('nao.e.jwt')).code).toBe('TOKEN_INVALIDO');
    expect(erroDe(() => tokens.verify(semPerfil)).code).toBe('TOKEN_INVALIDO');
  });
});
