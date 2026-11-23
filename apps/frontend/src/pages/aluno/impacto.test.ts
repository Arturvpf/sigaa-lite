import { describe, expect, it } from 'vitest';
import type { Progresso } from '../../api/aluno';
import { calcularImpacto } from './impacto';

function progresso(perfil: { integralizada: number; emCurso: number }): Progresso {
  return {
    curso: { id: 1, nome: 'CC' },
    grupos: [
      {
        grupo: 'ELETIVA_PERFIL',
        chExigida: 120,
        chIntegralizada: perfil.integralizada,
        chEmCurso: perfil.emCurso,
        chFaltante: Math.max(0, 120 - perfil.integralizada),
        percentual: 0,
      },
    ],
  };
}

describe('calcularImpacto', () => {
  it('obrigatória e eletiva livre contam inteiras no próprio grupo', () => {
    const p = progresso({ integralizada: 120, emCurso: 0 });

    expect(calcularImpacto('OBRIGATORIA', 60, p)).toEqual({ noGrupo: 60, comoLivre: 0 });
    expect(calcularImpacto('ELETIVA_LIVRE', 30, p)).toEqual({ noGrupo: 30, comoLivre: 0 });
  });

  it('eletiva de perfil com espaço sobrando conta inteira como perfil', () => {
    expect(
      calcularImpacto('ELETIVA_PERFIL', 60, progresso({ integralizada: 30, emCurso: 0 })),
    ).toEqual({
      noGrupo: 60,
      comoLivre: 0,
    });
  });

  it('com o perfil já completo, tudo conta como eletiva livre (regra 11)', () => {
    expect(
      calcularImpacto('ELETIVA_PERFIL', 60, progresso({ integralizada: 120, emCurso: 0 })),
    ).toEqual({
      noGrupo: 0,
      comoLivre: 60,
    });
  });

  it('divide entre perfil e livre quando só parte cabe, contando o que já está em curso', () => {
    // 120 exigidas − 60 integralizadas − 30 em curso = 30h ainda cabem em perfil
    expect(
      calcularImpacto('ELETIVA_PERFIL', 60, progresso({ integralizada: 60, emCurso: 30 })),
    ).toEqual({
      noGrupo: 30,
      comoLivre: 30,
    });
  });
});
