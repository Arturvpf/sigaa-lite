import type { TipoDisciplina } from '../../generated/prisma/client.js';

export type Classificacao = 'OBRIGATORIA' | 'ELETIVA_PERFIL' | 'ELETIVA_LIVRE';

/** Estrutura curricular de um curso: disciplinaId → tipo. */
export type EstruturaCurso = ReadonlyMap<number, TipoDisciplina>;

/**
 * Regra 10: a classificação depende do curso do aluno.
 * Está na estrutura como obrigatória ou eletiva de perfil → conta assim;
 * não está na estrutura → eletiva livre.
 */
export function classificar(disciplinaId: number, estrutura: EstruturaCurso): Classificacao {
  return estrutura.get(disciplinaId) ?? 'ELETIVA_LIVRE';
}
