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
          <ResumoProgresso grupos={progresso.data.grupos} />
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

/**
 * Total do curso. Cada grupo entra no máximo com o que exige: CH acima do exigido
 * (ex.: eletiva livre além do necessário) não adianta a conclusão do curso.
 */
function ResumoProgresso({ grupos }: { grupos: ProgressoGrupo[] }) {
  const exigida = grupos.reduce((soma, g) => soma + g.chExigida, 0);
  const integralizada = grupos.reduce(
    (soma, g) => soma + Math.min(g.chIntegralizada, g.chExigida),
    0,
  );
  const emCurso = grupos.reduce((soma, g) => soma + g.chEmCurso, 0);

  return (
    <section className="resumo-progresso" aria-label="Resumo do curso">
      <div>
        <div className="resumo-progresso__rotulo">Integralizado no total</div>
        <div className="resumo-progresso__valor">
          {integralizada}h <small>de {exigida}h</small>
        </div>
      </div>
      {emCurso > 0 && <span className="resumo-progresso__em-curso">{emCurso}h em curso</span>}
    </section>
  );
}

function CartaoGrupo({ grupo }: { grupo: ProgressoGrupo }) {
  const rotulo = ROTULO_CLASSIFICACAO[grupo.grupo];
  const concluido = grupo.chFaltante === 0;
  // Parte em curso da barra (listrada): o que ainda cabe depois do integralizado
  const percentualEmCurso =
    grupo.chExigida === 0
      ? 0
      : Math.min(100 - grupo.percentual, Math.floor((grupo.chEmCurso / grupo.chExigida) * 100));

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
        <div
          className={`barra-progresso__preenchido ${concluido ? 'barra-progresso__preenchido--concluido' : ''}`}
          style={{ width: `${grupo.percentual}%` }}
        />
        {percentualEmCurso > 0 && (
          <div className="barra-progresso__em-curso" style={{ width: `${percentualEmCurso}%` }} />
        )}
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
