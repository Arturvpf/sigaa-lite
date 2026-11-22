import { type ProgressoGrupo, ROTULO_CLASSIFICACAO } from '../../api/aluno';
import { Carregando, ErroAoCarregar } from '../../components/EstadoLista';
import { useProgresso } from '../../hooks/useAluno';

export function ProgressoPage() {
  const progresso = useProgresso();

  return (
    <section>
      <h1>Progresso no curso</h1>

      {progresso.isPending ? (
        <Carregando texto="Calculando progresso…" />
      ) : progresso.isError ? (
        <ErroAoCarregar erro={progresso.error} onTentarNovamente={() => progresso.refetch()} />
      ) : (
        <>
          <p className="texto-suave">{progresso.data.curso.nome}</p>
          <ul className="lista lista--grade" aria-label="Progresso por grupo">
            {progresso.data.grupos.map((grupo) => (
              <CartaoGrupo key={grupo.grupo} grupo={grupo} />
            ))}
          </ul>
          <p className="nota">
            Só disciplinas aprovadas contam como integralizadas; as matrículas deste semestre
            aparecem como “em curso”. A carga horária de eletivas de perfil acima do exigido conta
            como eletiva livre.
          </p>
        </>
      )}
    </section>
  );
}

function CartaoGrupo({ grupo }: { grupo: ProgressoGrupo }) {
  const rotulo = ROTULO_CLASSIFICACAO[grupo.grupo];
  const concluido = grupo.chFaltante === 0;

  return (
    <li className="cartao grupo-progresso">
      <div className="grupo-progresso__cabecalho">
        <h2>{rotulo}</h2>
        <span className={`percentual ${concluido ? 'percentual--concluido' : ''}`}>
          {grupo.percentual}%
        </span>
      </div>

      <div
        className="barra-progresso"
        role="progressbar"
        aria-label={`${rotulo}: ${grupo.percentual}% integralizado`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={grupo.percentual}
      >
        <div className="barra-progresso__preenchido" style={{ width: `${grupo.percentual}%` }} />
      </div>

      <dl className="numeros">
        <div>
          <dt>Exigida</dt>
          <dd>{grupo.chExigida}h</dd>
        </div>
        <div>
          <dt>Integralizada</dt>
          <dd>{grupo.chIntegralizada}h</dd>
        </div>
        <div>
          <dt>Em curso</dt>
          <dd>{grupo.chEmCurso}h</dd>
        </div>
        <div>
          <dt>Falta</dt>
          <dd>{concluido ? 'Concluído' : `${grupo.chFaltante}h`}</dd>
        </div>
      </dl>
    </li>
  );
}
