interface BarraOcupacaoProps {
  ocupadas: number;
  vagas: number;
  disponiveis: number;
}

/** Até este número de vagas, a barra mostra um segmento por vaga. */
const MAXIMO_SEGMENTOS = 12;

/**
 * Barra de ocupação da turma: verde com folga, âmbar com até 3 vagas, vermelha lotada.
 * Em turmas pequenas cada vaga vira um segmento, para ver os lugares que restam.
 * É decorativa (aria-hidden): os números aparecem sempre em texto ao lado.
 */
export function BarraOcupacao({ ocupadas, vagas, disponiveis }: BarraOcupacaoProps) {
  const estado =
    disponiveis === 0 ? 'ocupacao--lotada' : disponiveis <= 3 ? 'ocupacao--poucas' : '';

  if (vagas > 0 && vagas <= MAXIMO_SEGMENTOS) {
    return (
      <div className={`ocupacao ocupacao--segmentos ${estado}`} aria-hidden="true">
        {Array.from({ length: vagas }, (_, i) => (
          <span
            key={i}
            className={`ocupacao__segmento ${i < ocupadas ? 'ocupacao__segmento--ocupado' : ''}`}
          />
        ))}
      </div>
    );
  }

  const percentual = vagas > 0 ? Math.min(100, Math.round((ocupadas / vagas) * 100)) : 0;
  return (
    <div className={`ocupacao ${estado}`} aria-hidden="true">
      <div className="ocupacao__preenchido" style={{ width: `${percentual}%` }} />
    </div>
  );
}
