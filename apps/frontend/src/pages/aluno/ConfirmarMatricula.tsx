import { useEffect, useId, useRef } from 'react';
import { type Oferta, type ProgressoGrupo, ROTULO_CLASSIFICACAO } from '../../api/aluno';
import { useAuth } from '../../auth/auth-context';
import { AnelProgresso } from '../../components/AnelProgresso';
import { useProgresso } from '../../hooks/useAluno';
import { calcularImpacto } from './impacto';

interface ConfirmarMatriculaProps {
  oferta: Oferta;
  confirmando: boolean;
  onConfirmar: () => void;
  onVoltar: () => void;
}

/**
 * Confirmação antes de matricular: resume a turma e mostra como a CH vai contar no
 * progresso do aluno. No celular é um painel que sobe da parte de baixo; em telas
 * maiores, uma janela centralizada. Esc ou "Voltar" fecham sem matricular.
 */
export function ConfirmarMatricula({
  oferta,
  confirmando,
  onConfirmar,
  onVoltar,
}: ConfirmarMatriculaProps) {
  const tituloId = useId();
  const botaoConfirmar = useRef<HTMLButtonElement>(null);
  const { disciplina, professor } = oferta;

  useEffect(() => {
    botaoConfirmar.current?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !confirmando) onVoltar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onVoltar, confirmando]);

  return (
    <div className="folha__fundo" onClick={() => !confirmando && onVoltar()}>
      <section
        className="folha"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="folha__alca" aria-hidden="true" />
        <div className="folha__cabecalho">
          <span className="sobretitulo" aria-hidden="true">
            $ matricular {disciplina.codigo}
          </span>
          <h2 id={tituloId}>
            {disciplina.codigo} · {disciplina.nome}
          </h2>
        </div>

        <dl className="resumo">
          <div>
            <dt>Professor</dt>
            <dd>{professor.nome}</dd>
          </div>
          <div>
            <dt>Carga horária</dt>
            <dd>{disciplina.ch}h</dd>
          </div>
          <div>
            <dt>Vagas</dt>
            <dd>
              {oferta.vagasDisponiveis} de {oferta.vagas} livres
            </dd>
          </div>
          <div>
            <dt>Pré-requisitos</dt>
            <dd>
              {oferta.preRequisitos.length > 0
                ? oferta.preRequisitos.map((p) => p.codigo).join(', ')
                : 'Nenhum'}
            </dd>
          </div>
        </dl>

        <ImpactoNoProgresso oferta={oferta} />

        <p className="texto-suave folha__nota">
          Você pode cancelar depois em Minhas matrículas, e a vaga volta para a turma.
        </p>

        <div className="folha__acoes">
          <button
            ref={botaoConfirmar}
            type="button"
            className="botao botao--primario botao--grande"
            onClick={onConfirmar}
            disabled={confirmando}
          >
            {confirmando ? 'Matriculando…' : 'Confirmar matrícula'}
          </button>
          <button
            type="button"
            className="botao botao--grande"
            onClick={onVoltar}
            disabled={confirmando}
          >
            Voltar
          </button>
        </div>
      </section>
    </div>
  );
}

/** Explica em que grupo a CH vai contar, inclusive o excedente de perfil (regra 11). */
function ImpactoNoProgresso({ oferta }: { oferta: Oferta }) {
  const { usuario } = useAuth();
  const progresso = useProgresso();
  const curso = usuario?.aluno?.curso.nome ?? 'seu curso';
  const ch = oferta.disciplina.ch;

  if (progresso.isError) return null;

  let texto;
  let comparacao = null;
  if (progresso.isPending) {
    texto = <span>Calculando…</span>;
  } else if (oferta.classificacao === 'OBRIGATORIA') {
    texto = (
      <span>
        É <strong>obrigatória</strong> em {curso}: as {ch}h contam nas obrigatórias.
      </span>
    );
  } else if (oferta.classificacao === 'ELETIVA_LIVRE') {
    texto = (
      <span>
        Não faz parte da estrutura de {curso}: as {ch}h contam como <strong>eletiva livre</strong>.
      </span>
    );
  } else {
    const { noGrupo, comoLivre } = calcularImpacto(oferta.classificacao, ch, progresso.data);
    texto =
      comoLivre === 0 ? (
        <span>
          É <strong>eletiva de perfil</strong> em {curso}: as {ch}h contam nas eletivas de perfil.
        </span>
      ) : noGrupo === 0 ? (
        <span>
          É <strong>eletiva de perfil</strong> em {curso}, mas você já completou a carga de perfil
          exigida (contando o que está em curso). Por isso estas {ch}h vão contar como{' '}
          <strong>eletiva livre</strong>.
        </span>
      ) : (
        <span>
          É <strong>eletiva de perfil</strong> em {curso}: {noGrupo}h contam como perfil e{' '}
          {comoLivre}h como <strong>eletiva livre</strong>, porque passam do exigido.
        </span>
      );
  }

  if (progresso.isSuccess) {
    const { noGrupo } = calcularImpacto(oferta.classificacao, ch, progresso.data);
    // O grupo que recebe a maior parte da CH: o da disciplina, ou eletiva livre quando
    // a eletiva de perfil já não cabe no perfil (regra 11)
    const destino = noGrupo > 0 ? oferta.classificacao : 'ELETIVA_LIVRE';
    const horas = noGrupo > 0 ? noGrupo : ch;
    const grupo = progresso.data.grupos.find((g) => g.grupo === destino);
    if (grupo) comparacao = <AntesDepois grupo={grupo} horas={horas} />;
  }

  return (
    <div className="impacto" role="note" aria-label="Como conta no seu progresso">
      <span className="impacto__titulo">Como conta no seu progresso</span>
      {comparacao}
      <p className="impacto__texto">{texto}</p>
    </div>
  );
}

/**
 * Anéis "hoje → com esta matrícula" do grupo que recebe a CH. "Hoje" soma o que já foi
 * integralizado com o que está em curso, porque é o que a nova matrícula vai encontrar.
 */
function AntesDepois({ grupo, horas }: { grupo: ProgressoGrupo; horas: number }) {
  const rotulo = ROTULO_CLASSIFICACAO[grupo.grupo].toLowerCase();
  const hoje = grupo.chIntegralizada + grupo.chEmCurso;
  const depois = hoje + horas;
  const percentual = (h: number) =>
    grupo.chExigida === 0 ? 100 : Math.min(100, Math.floor((h / grupo.chExigida) * 100));
  const completa = depois >= grupo.chExigida;

  return (
    <div className="impacto__comparacao">
      <div className="impacto__lado">
        <AnelProgresso
          grupo={grupo.grupo}
          percentual={percentual(hoje)}
          tamanho={48}
          rotulo={`${ROTULO_CLASSIFICACAO[grupo.grupo]} hoje: ${percentual(hoje)}%`}
        />
        <span>
          <span className="anel__valor">
            {hoje}h<span className="texto-suave">/{grupo.chExigida}h</span>
          </span>
          <span className="anel__rotulo">{rotulo} hoje</span>
        </span>
      </div>
      <span className="impacto__seta" aria-hidden="true">
        →
      </span>
      <div className="impacto__lado">
        <AnelProgresso
          grupo={grupo.grupo}
          percentual={percentual(depois)}
          tamanho={48}
          marcarConcluido
          rotulo={`${ROTULO_CLASSIFICACAO[grupo.grupo]} com esta matrícula: ${
            completa ? 'completa' : `${percentual(depois)}%`
          }`}
        />
        <span>
          <span className="anel__valor">+{horas}h</span>
          <span className="anel__rotulo">{completa ? `completa ${rotulo}` : rotulo}</span>
        </span>
      </div>
    </div>
  );
}
