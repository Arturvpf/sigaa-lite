import type { Oferta } from '../../api/aluno';
import { BarraOcupacao } from '../../components/BarraOcupacao';
import { EtiquetaClassificacao } from '../../components/EtiquetaClassificacao';
import { Icone } from '../../components/Icone';

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

      {oferta.preRequisitos.length > 0 && <PreRequisitos oferta={oferta} />}

      <BarraOcupacao
        ocupadas={oferta.vagasOcupadas}
        vagas={oferta.vagas}
        disponiveis={oferta.vagasDisponiveis}
      />

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

/** Pré-requisitos da disciplina, cada um marcado como atendido ou pendente (texto + ícone). */
function PreRequisitos({ oferta }: { oferta: Oferta }) {
  return (
    <div className="pre-requisitos">
      <span className="pre-requisitos__rotulo">Pré-requisitos:</span>
      <ul className="pre-requisitos__lista">
        {oferta.preRequisitos.map((p) => (
          <li
            key={p.id}
            className={`pre-requisito ${p.atendido ? 'pre-requisito--ok' : 'pre-requisito--pendente'}`}
            title={p.nome}
          >
            <Icone nome={p.atendido ? 'check' : 'x'} tamanho={12} /> {p.codigo}
            <span className="visualmente-oculto">{p.atendido ? ' (aprovado)' : ' (pendente)'}</span>
          </li>
        ))}
      </ul>
    </div>
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
    return (
      <span className="situacao situacao--matriculado">
        <Icone nome="check" tamanho={16} />
        Matriculado
      </span>
    );
  }
  if (oferta.jaAprovado) {
    return <span className="situacao">Já aprovado</span>;
  }
  const preRequisitoPendente = oferta.preRequisitos.some((p) => !p.atendido);
  const texto = matriculando
    ? 'Matriculando…'
    : preRequisitoPendente
      ? 'Pré-requisito pendente'
      : oferta.lotada
        ? 'Sem vagas'
        : 'Matricular';
  return (
    <button
      type="button"
      className="botao botao--primario"
      onClick={() => onMatricular(oferta.id)}
      disabled={oferta.lotada || preRequisitoPendente || bloqueado}
      // O nome acessível começa com o texto visível (que muda com o estado) e diz a disciplina
      aria-label={`${texto} em ${oferta.disciplina.codigo}`}
    >
      {texto}
    </button>
  );
}
