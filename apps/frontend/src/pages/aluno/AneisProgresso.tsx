import { Link } from 'react-router';
import { ROTULO_CLASSIFICACAO } from '../../api/aluno';
import { AnelProgresso } from '../../components/AnelProgresso';
import { useProgresso } from '../../hooks/useAluno';

const ROTULO_CURTO = {
  OBRIGATORIA: 'obrig.',
  ELETIVA_PERFIL: 'perfil',
  ELETIVA_LIVRE: 'livre',
} as const;

/**
 * Painel compacto do progresso no topo das ofertas: um anel por grupo, para o aluno
 * escolher a turma sabendo onde ainda falta CH. Some enquanto carrega ou se falhar
 * (a tela de Progresso continua sendo a fonte completa).
 */
export function AneisProgresso() {
  const progresso = useProgresso();
  if (!progresso.isSuccess) return null;

  return (
    <nav className="aneis" aria-label="Resumo do progresso">
      {progresso.data.grupos.map((g) => (
        <Link
          key={g.grupo}
          to="/aluno/progresso"
          className="anel-cartao"
          aria-label={`${ROTULO_CLASSIFICACAO[g.grupo]}: ${g.percentual}% integralizado`}
        >
          <AnelProgresso grupo={g.grupo} percentual={g.percentual} />
          <span>
            <span className="anel__valor">{g.percentual}%</span>
            <span className="anel__rotulo">{ROTULO_CURTO[g.grupo]}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
