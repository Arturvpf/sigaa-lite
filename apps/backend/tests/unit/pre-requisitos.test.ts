import { describe, expect, it } from 'vitest';
import { criariaCiclo } from '../../src/modules/secretaria/pre-requisitos.js';

const A = 1;
const B = 2;
const C = 3;
const D = 4;

const exige = (disciplinaId: number, preRequisitoId: number) => ({ disciplinaId, preRequisitoId });

describe('criariaCiclo', () => {
  it('sem arestas, nenhum pré-requisito cria ciclo', () => {
    expect(criariaCiclo([], A, [B, C])).toBe(false);
  });

  it('detecta ciclo direto: B exige A, então A não pode exigir B', () => {
    expect(criariaCiclo([exige(B, A)], A, [B])).toBe(true);
  });

  it('detecta ciclo indireto: B exige C, C exige A, então A não pode exigir B', () => {
    expect(criariaCiclo([exige(B, C), exige(C, A)], A, [B])).toBe(true);
  });

  it('cadeia sem volta não é ciclo: A exige B e B exige C', () => {
    expect(criariaCiclo([exige(B, C)], A, [B])).toBe(false);
  });

  it('dois caminhos para o mesmo pré-requisito (losango) não é ciclo', () => {
    // A exige B e C; B e C exigem D
    expect(criariaCiclo([exige(B, D), exige(C, D)], A, [B, C])).toBe(false);
  });

  it('ignora as arestas atuais da própria disciplina, que serão substituídas', () => {
    // Hoje A exige C; trocar para A exige B não deve ser afetado por A -> C
    expect(criariaCiclo([exige(A, C), exige(C, D)], A, [B])).toBe(false);
  });

  it('não entra em laço infinito com ciclos que já existam em outra parte do grafo', () => {
    expect(criariaCiclo([exige(B, C), exige(C, B)], A, [B])).toBe(false);
  });
});
