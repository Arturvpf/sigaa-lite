import { type Classificacao, classificar, type EstruturaCurso } from './classificacao.js';

export interface CHExigida {
  chObrigatoria: number;
  chEletivaPerfil: number;
  chEletivaLivre: number;
}

export interface DisciplinaCursada {
  disciplinaId: number;
  ch: number;
}

export interface ProgressoGrupo {
  grupo: Classificacao;
  chExigida: number;
  /** CH aprovada no histórico (pode passar do exigido; o percentual é que é limitado). */
  chIntegralizada: number;
  /** CH das matrículas ativas do semestre. */
  chEmCurso: number;
  /** Quanto falta integralizar; nunca negativo. */
  chFaltante: number;
  /** Percentual integralizado, de 0 a 100. */
  percentual: number;
}

export interface EntradaProgresso {
  chExigida: CHExigida;
  estrutura: EstruturaCurso;
  /** Disciplinas APROVADAS no histórico. Reprovações não entram (regra 12). */
  aprovadas: DisciplinaCursada[];
  /** Disciplinas das matrículas ATIVAS. */
  emCurso: DisciplinaCursada[];
}

/**
 * Calcula o progresso do aluno em cada grupo de CH.
 *
 * Função pura (sem banco, sem data, sem efeitos colaterais) para que as regras
 * 10 a 13 possam ser testadas diretamente:
 * - regra 10: cada disciplina é classificada pela estrutura do curso do aluno;
 * - regra 11: CH de eletiva de perfil acima do exigido conta como eletiva livre;
 * - regra 12: só aprovadas integralizam; matrículas ativas aparecem como "em curso";
 * - regra 13: percentual nunca passa de 100% e CH faltante nunca é negativa.
 */
export function calcularProgresso(entrada: EntradaProgresso): ProgressoGrupo[] {
  const { chExigida, estrutura } = entrada;

  // Uma disciplina aprovada conta uma vez só, mesmo que apareça repetida
  const integralizada = somarPorGrupo(unicas(entrada.aprovadas), estrutura);
  const emCurso = somarPorGrupo(entrada.emCurso, estrutura);

  // Regra 11: o que passar do exigido em eletiva de perfil vira eletiva livre
  const excedentePerfil = Math.max(0, integralizada.ELETIVA_PERFIL - chExigida.chEletivaPerfil);
  integralizada.ELETIVA_PERFIL -= excedentePerfil;
  integralizada.ELETIVA_LIVRE += excedentePerfil;

  // Mesma regra para a CH em curso: só cabe em perfil o que ainda falta de perfil;
  // o restante já é contado como livre (é assim que ela vai integralizar se aprovada)
  const faltaPerfil = chExigida.chEletivaPerfil - integralizada.ELETIVA_PERFIL;
  const excedenteEmCurso = Math.max(0, emCurso.ELETIVA_PERFIL - faltaPerfil);
  emCurso.ELETIVA_PERFIL -= excedenteEmCurso;
  emCurso.ELETIVA_LIVRE += excedenteEmCurso;

  return [
    grupo('OBRIGATORIA', chExigida.chObrigatoria, integralizada, emCurso),
    grupo('ELETIVA_PERFIL', chExigida.chEletivaPerfil, integralizada, emCurso),
    grupo('ELETIVA_LIVRE', chExigida.chEletivaLivre, integralizada, emCurso),
  ];
}

type SomaPorGrupo = Record<Classificacao, number>;

function somarPorGrupo(disciplinas: DisciplinaCursada[], estrutura: EstruturaCurso): SomaPorGrupo {
  const soma: SomaPorGrupo = { OBRIGATORIA: 0, ELETIVA_PERFIL: 0, ELETIVA_LIVRE: 0 };
  for (const { disciplinaId, ch } of disciplinas) {
    soma[classificar(disciplinaId, estrutura)] += ch;
  }
  return soma;
}

function unicas(disciplinas: DisciplinaCursada[]): DisciplinaCursada[] {
  return [...new Map(disciplinas.map((d) => [d.disciplinaId, d])).values()];
}

function grupo(
  nome: Classificacao,
  chExigida: number,
  integralizada: SomaPorGrupo,
  emCurso: SomaPorGrupo,
): ProgressoGrupo {
  const chIntegralizada = integralizada[nome];
  return {
    grupo: nome,
    chExigida,
    chIntegralizada,
    chEmCurso: emCurso[nome],
    chFaltante: Math.max(0, chExigida - chIntegralizada),
    // Arredonda para baixo: 99,6% não deve aparecer como 100% concluído
    percentual: chExigida === 0 ? 100 : Math.min(100, Math.floor((chIntegralizada / chExigida) * 100)),
  };
}
