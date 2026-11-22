import type { Oferta } from '../../api/aluno';
import { EtiquetaClassificacao } from '../../components/EtiquetaClassificacao';

interface OfertaCardProps {
  oferta: Oferta;
  onMatricular: (turmaId: number) => void;
  /** Esta oferta está com a matrícula em andamento. */
  matriculando: boolean;
  /** Alguma matrícula está em andamento (evita cliques em várias ofertas ao mesmo tempo). */
  bloqueado: boolean;
}

export function OfertaCard({ oferta, onMatricular, matriculando, bloqueado }: OfertaCardProps) {
  const { disciplina, professor } = oferta;
  const tituloId = `oferta-${oferta.id}`;

  return (
    <li className="cartao item-lista" aria-labelledby={tituloId}>
      <div className="item-lista__cabecalho">
        <div>
          <h2 className="item-lista__titulo" id={tituloId}>
            <span className="codigo">{disciplina.codigo}</span> {disciplina.nome}
          </h2>
          <p className="item-lista__detalhe">
            {professor.nome} · {disciplina.ch}h
          </p>
        </div>
        <EtiquetaClassificacao classificacao={oferta.classificacao} />
      </div>

      <div className="item-lista__rodape">
        <Vagas oferta={oferta} />
        <AcaoOferta
          oferta={oferta}
          onMatricular={onMatricular}
          matriculando={matriculando}
          bloqueado={bloqueado}
        />
      </div>
    </li>
  );
}

function Vagas({ oferta }: { oferta: Oferta }) {
  if (oferta.lotada) {
    return <span className="vagas vagas--lotada">Turma lotada ({oferta.vagas} vagas)</span>;
  }
  const texto =
    oferta.vagasDisponiveis === 1
      ? '1 vaga disponível'
      : `${oferta.vagasDisponiveis} vagas disponíveis`;
  return (
    <span className={`vagas ${oferta.vagasDisponiveis <= 3 ? 'vagas--poucas' : ''}`}>
      {texto} <span className="texto-suave">de {oferta.vagas}</span>
    </span>
  );
}

/**
 * O que o aluno pode fazer com a oferta. Situações em que a API recusaria a matrícula
 * já aparecem sinalizadas, mas a API continua sendo quem decide (a tela pode estar desatualizada).
 */
function AcaoOferta({ oferta, onMatricular, matriculando, bloqueado }: OfertaCardProps) {
  if (oferta.matriculaId !== null) {
    return <span className="situacao situacao--matriculado">✓ Matriculado</span>;
  }
  if (oferta.jaAprovado) {
    return <span className="situacao">Já aprovado</span>;
  }
  return (
    <button
      type="button"
      className="botao botao--primario"
      onClick={() => onMatricular(oferta.id)}
      disabled={oferta.lotada || bloqueado}
    >
      {matriculando ? 'Matriculando…' : oferta.lotada ? 'Sem vagas' : 'Matricular'}
      <span className="visualmente-oculto"> em {oferta.disciplina.codigo}</span>
    </button>
  );
}
