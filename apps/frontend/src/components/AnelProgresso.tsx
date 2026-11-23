import type { Classificacao } from '../api/aluno';

/** Cor do anel de cada grupo (as mesmas das etiquetas de classificação). */
const COR_DO_GRUPO: Record<Classificacao, string> = {
  OBRIGATORIA: 'var(--anel-obrigatoria)',
  ELETIVA_PERFIL: 'var(--anel-perfil)',
  ELETIVA_LIVRE: 'var(--anel-livre)',
};

const RAIO = 15;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

interface AnelProgressoProps {
  grupo: Classificacao;
  /** 0 a 100. */
  percentual: number;
  tamanho?: number;
  /** Mostra um "check" no centro quando o grupo está completo. */
  marcarConcluido?: boolean;
  /** Texto para leitores de tela; sem ele o anel é decorativo. */
  rotulo?: string;
}

/** Anel de progresso de um grupo de CH, no estilo de um medidor circular. */
export function AnelProgresso({
  grupo,
  percentual,
  tamanho = 36,
  marcarConcluido = false,
  rotulo,
}: AnelProgressoProps) {
  const valor = Math.max(0, Math.min(100, percentual));
  const cor = COR_DO_GRUPO[grupo];
  const completo = valor >= 100;
  const acessibilidade = rotulo
    ? ({ role: 'img', 'aria-label': rotulo } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <svg className="anel" width={tamanho} height={tamanho} viewBox="0 0 36 36" {...acessibilidade}>
      <circle className="anel__trilha" cx="18" cy="18" r={RAIO} fill="none" strokeWidth="4" />
      {valor > 0 && (
        <circle
          cx="18"
          cy="18"
          r={RAIO}
          fill="none"
          stroke={cor}
          strokeWidth="4"
          strokeLinecap={completo ? 'butt' : 'round'}
          strokeDasharray={`${(valor / 100) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
          transform="rotate(-90 18 18)"
        />
      )}
      {completo && marcarConcluido && (
        <path
          d="m12 18 4 4 8-8"
          fill="none"
          stroke={cor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
