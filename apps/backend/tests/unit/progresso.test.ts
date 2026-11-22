import { describe, expect, it } from 'vitest';
import { classificar, type EstruturaCurso } from '../../src/modules/aluno/classificacao.js';
import {
  calcularProgresso,
  type EntradaProgresso,
  type ProgressoGrupo,
} from '../../src/modules/aluno/progresso.js';

// Disciplinas de exemplo (id → CH definida em cada teste)
const PROG = 1; // obrigatória em CC, perfil em EC
const REDES = 2; // perfil em CC, obrigatória em EC
const IA = 3; // perfil nos dois
const CG = 4; // perfil em CC, fora de EC
const SEG = 5; // perfil em CC, fora de EC
const LIBRAS = 6; // fora dos dois

const estruturaCC: EstruturaCurso = new Map([
  [PROG, 'OBRIGATORIA'],
  [REDES, 'ELETIVA_PERFIL'],
  [IA, 'ELETIVA_PERFIL'],
  [CG, 'ELETIVA_PERFIL'],
  [SEG, 'ELETIVA_PERFIL'],
]);

const estruturaEC: EstruturaCurso = new Map([
  [PROG, 'ELETIVA_PERFIL'],
  [REDES, 'OBRIGATORIA'],
  [IA, 'ELETIVA_PERFIL'],
]);

const chExigida = { chObrigatoria: 120, chEletivaPerfil: 120, chEletivaLivre: 60 };

function progresso(parcial: Partial<EntradaProgresso>) {
  const resultado = calcularProgresso({
    chExigida,
    estrutura: estruturaCC,
    aprovadas: [],
    emCurso: [],
    ...parcial,
  });
  const porGrupo = Object.fromEntries(resultado.map((g) => [g.grupo, g]));
  return porGrupo as Record<ProgressoGrupo['grupo'], ProgressoGrupo>;
}

describe('classificação da disciplina (regra 10)', () => {
  it('a mesma disciplina é classificada de forma diferente em cada curso', () => {
    expect(classificar(PROG, estruturaCC)).toBe('OBRIGATORIA');
    expect(classificar(PROG, estruturaEC)).toBe('ELETIVA_PERFIL');
    expect(classificar(REDES, estruturaCC)).toBe('ELETIVA_PERFIL');
    expect(classificar(REDES, estruturaEC)).toBe('OBRIGATORIA');
  });

  it('disciplina fora da estrutura do curso é eletiva livre', () => {
    expect(classificar(CG, estruturaEC)).toBe('ELETIVA_LIVRE');
    expect(classificar(LIBRAS, estruturaCC)).toBe('ELETIVA_LIVRE');
  });

  it('o progresso soma a mesma aprovação em grupos diferentes conforme o curso', () => {
    const aprovadas = [{ disciplinaId: PROG, ch: 60 }];

    expect(progresso({ aprovadas, estrutura: estruturaCC }).OBRIGATORIA.chIntegralizada).toBe(60);
    expect(progresso({ aprovadas, estrutura: estruturaEC }).ELETIVA_PERFIL.chIntegralizada).toBe(
      60,
    );
  });
});

describe('progresso no curso', () => {
  it('sem histórico nem matrículas, tudo falta e o percentual é zero', () => {
    const p = progresso({});

    expect(p.OBRIGATORIA).toEqual({
      grupo: 'OBRIGATORIA',
      chExigida: 120,
      chIntegralizada: 0,
      chEmCurso: 0,
      chFaltante: 120,
      percentual: 0,
    });
  });

  it('calcula integralizada, faltante e percentual de cada grupo', () => {
    const p = progresso({
      aprovadas: [
        { disciplinaId: PROG, ch: 60 },
        { disciplinaId: IA, ch: 30 },
        { disciplinaId: LIBRAS, ch: 45 },
      ],
    });

    expect(p.OBRIGATORIA).toMatchObject({ chIntegralizada: 60, chFaltante: 60, percentual: 50 });
    expect(p.ELETIVA_PERFIL).toMatchObject({ chIntegralizada: 30, chFaltante: 90, percentual: 25 });
    expect(p.ELETIVA_LIVRE).toMatchObject({ chIntegralizada: 45, chFaltante: 15, percentual: 75 });
  });

  describe('excedente de eletiva de perfil (regra 11)', () => {
    it('a CH de perfil acima do exigido conta como eletiva livre', () => {
      // 60 + 60 + 45 = 165h de perfil para 120h exigidas → 45h excedentes
      const p = progresso({
        aprovadas: [
          { disciplinaId: REDES, ch: 60 },
          { disciplinaId: IA, ch: 60 },
          { disciplinaId: SEG, ch: 45 },
        ],
      });

      expect(p.ELETIVA_PERFIL).toMatchObject({ chIntegralizada: 120, percentual: 100 });
      expect(p.ELETIVA_LIVRE).toMatchObject({ chIntegralizada: 45, chFaltante: 15 });
    });

    it('o excedente se soma às eletivas livres já cursadas', () => {
      const p = progresso({
        aprovadas: [
          { disciplinaId: REDES, ch: 60 },
          { disciplinaId: IA, ch: 60 },
          { disciplinaId: CG, ch: 30 },
          { disciplinaId: LIBRAS, ch: 15 },
        ],
      });

      expect(p.ELETIVA_LIVRE.chIntegralizada).toBe(45);
    });

    it('sem excedente, nada é movido para eletiva livre', () => {
      const p = progresso({ aprovadas: [{ disciplinaId: IA, ch: 120 }] });

      expect(p.ELETIVA_PERFIL.chIntegralizada).toBe(120);
      expect(p.ELETIVA_LIVRE.chIntegralizada).toBe(0);
    });

    it('perfil em curso que passaria do exigido aparece como livre em curso', () => {
      // Já tem 90h de perfil; cursando 60h de perfil → 30h cabem em perfil, 30h vão para livre
      const p = progresso({
        aprovadas: [
          { disciplinaId: REDES, ch: 60 },
          { disciplinaId: SEG, ch: 30 },
        ],
        emCurso: [{ disciplinaId: IA, ch: 60 }],
      });

      expect(p.ELETIVA_PERFIL.chEmCurso).toBe(30);
      expect(p.ELETIVA_LIVRE.chEmCurso).toBe(30);
    });
  });

  describe('integralizada x em curso (regra 12)', () => {
    it('reprovações não somam (só aprovadas são informadas ao cálculo)', () => {
      const p = progresso({ aprovadas: [] });

      expect(p.OBRIGATORIA.chIntegralizada).toBe(0);
    });

    it('matrícula ativa soma apenas em "em curso", sem reduzir o que falta', () => {
      const p = progresso({ emCurso: [{ disciplinaId: PROG, ch: 60 }] });

      expect(p.OBRIGATORIA).toMatchObject({
        chIntegralizada: 0,
        chEmCurso: 60,
        chFaltante: 120,
        percentual: 0,
      });
    });

    it('a mesma disciplina aprovada duas vezes no histórico conta uma vez só', () => {
      const p = progresso({
        aprovadas: [
          { disciplinaId: PROG, ch: 60 },
          { disciplinaId: PROG, ch: 60 },
        ],
      });

      expect(p.OBRIGATORIA.chIntegralizada).toBe(60);
    });
  });

  describe('limites (regra 13)', () => {
    it('o percentual não passa de 100% e o faltante não fica negativo', () => {
      const p = progresso({
        aprovadas: [
          { disciplinaId: LIBRAS, ch: 60 },
          { disciplinaId: CG + 100, ch: 45 }, // outra disciplina fora da estrutura
        ],
      });

      expect(p.ELETIVA_LIVRE).toMatchObject({
        chIntegralizada: 105,
        chFaltante: 0,
        percentual: 100,
      });
    });

    it('arredonda o percentual para baixo (não mostra 100% antes de concluir)', () => {
      const p = progresso({
        chExigida: { ...chExigida, chEletivaLivre: 61 },
        aprovadas: [{ disciplinaId: LIBRAS, ch: 60 }],
      });

      expect(p.ELETIVA_LIVRE.percentual).toBe(98);
    });

    it('grupo sem CH exigida aparece como 100% concluído', () => {
      const p = progresso({ chExigida: { ...chExigida, chEletivaLivre: 0 } });

      expect(p.ELETIVA_LIVRE).toMatchObject({ chFaltante: 0, percentual: 100 });
    });
  });
});
