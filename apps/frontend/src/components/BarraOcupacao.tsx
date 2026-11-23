interface BarraOcupacaoProps {
  ocupadas: number;
  vagas: number;
  disponiveis: number;
}

/**
 * Barra de ocupação da turma: verde com folga, âmbar com até 3 vagas, vermelha lotada.
 * É decorativa (aria-hidden): os números aparecem sempre em texto ao lado.
 */
export function BarraOcupacao({ ocupadas, vagas, disponiveis }: BarraOcupacaoProps) {
  const percentual = vagas > 0 ? Math.min(100, Math.round((ocupadas / vagas) * 100)) : 0;
  const estado =
    disponiveis === 0 ? 'ocupacao--lotada' : disponiveis <= 3 ? 'ocupacao--poucas' : '';

  return (
    <div className={`ocupacao ${estado}`} aria-hidden="true">
      <div className="ocupacao__preenchido" style={{ width: `${percentual}%` }} />
    </div>
  );
}
