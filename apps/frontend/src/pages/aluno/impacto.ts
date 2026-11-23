import type { Classificacao, Progresso } from '../../api/aluno';

export interface ImpactoNoProgresso {
  /** Horas que contarão como a classificação da disciplina. */
  noGrupo: number;
  /** Horas de eletiva de perfil que vão para eletiva livre por excederem o exigido (regra 11). */
  comoLivre: number;
}

/**
 * Como a CH de uma disciplina vai contar no progresso se o aluno se matricular nela.
 *
 * Usa a mesma regra do back-end para a CH em curso: em eletiva de perfil só cabe o que ainda
 * falta de perfil, descontando o que já está integralizado e o que já está em curso; o restante
 * conta como eletiva livre. Para os outros grupos, conta inteira no próprio grupo.
 */
export function calcularImpacto(
  classificacao: Classificacao,
  ch: number,
  progresso: Progresso,
): ImpactoNoProgresso {
  if (classificacao !== 'ELETIVA_PERFIL') return { noGrupo: ch, comoLivre: 0 };

  const perfil = progresso.grupos.find((g) => g.grupo === 'ELETIVA_PERFIL');
  if (!perfil) return { noGrupo: ch, comoLivre: 0 };

  const cabeEmPerfil = Math.max(0, perfil.chExigida - perfil.chIntegralizada - perfil.chEmCurso);
  const noGrupo = Math.min(ch, cabeEmPerfil);
  return { noGrupo, comoLivre: ch - noGrupo };
}
