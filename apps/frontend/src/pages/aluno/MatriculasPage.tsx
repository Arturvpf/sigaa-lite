import { useState } from 'react';
import { Link } from 'react-router';
import type { Matricula } from '../../api/aluno';
import { DialogoConfirmacao } from '../../components/DialogoConfirmacao';
import { Carregando, ErroAoCarregar } from '../../components/EstadoLista';
import { EtiquetaClassificacao } from '../../components/EtiquetaClassificacao';
import { useCancelarMatricula, useMinhasMatriculas } from '../../hooks/useAluno';

export function MatriculasPage() {
  const matriculas = useMinhasMatriculas();
  const cancelar = useCancelarMatricula();
  const [aCancelar, setACancelar] = useState<Matricula | null>(null);

  function confirmarCancelamento() {
    if (!aCancelar) return;
    cancelar.mutate(aCancelar.id, { onSettled: () => setACancelar(null) });
  }

  return (
    <section>
      <h1>Minhas matrículas</h1>

      {matriculas.isPending ? (
        <Carregando texto="Carregando matrículas…" />
      ) : matriculas.isError ? (
        <ErroAoCarregar erro={matriculas.error} onTentarNovamente={() => matriculas.refetch()} />
      ) : matriculas.data.length === 0 ? (
        <div className="estado">
          <p>Você não tem matrículas ativas neste semestre.</p>
          <Link className="botao botao--primario" to="/aluno/ofertas">
            Ver ofertas
          </Link>
        </div>
      ) : (
        <>
          <p className="texto-suave">
            {matriculas.data.length === 1
              ? '1 matrícula ativa'
              : `${matriculas.data.length} matrículas ativas`}{' '}
            · {matriculas.data.reduce((soma, m) => soma + m.turma.disciplina.ch, 0)}h no semestre
          </p>
          <ul className="lista" aria-label="Matrículas ativas">
            {matriculas.data.map((matricula) => {
              const { disciplina, professor } = matricula.turma;
              return (
                <li key={matricula.id} className="cartao item-lista">
                  <div className="item-lista__cabecalho">
                    <div>
                      <h2 className="item-lista__titulo">
                        <span className="codigo">{disciplina.codigo}</span> {disciplina.nome}
                      </h2>
                      <p className="item-lista__detalhe">
                        {professor.nome} · {disciplina.ch}h
                      </p>
                    </div>
                    <EtiquetaClassificacao classificacao={matricula.classificacao} />
                  </div>
                  <div className="item-lista__rodape item-lista__rodape--fim">
                    <button
                      type="button"
                      className="botao botao--perigo-contorno"
                      onClick={() => setACancelar(matricula)}
                      aria-label={`Cancelar matrícula em ${disciplina.codigo}`}
                    >
                      Cancelar matrícula
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {aCancelar && (
        <DialogoConfirmacao
          titulo="Cancelar matrícula?"
          textoConfirmar="Cancelar matrícula"
          confirmando={cancelar.isPending}
          onConfirmar={confirmarCancelamento}
          onCancelar={() => setACancelar(null)}
        >
          <p>
            Você vai sair de{' '}
            <strong>
              {aCancelar.turma.disciplina.codigo} — {aCancelar.turma.disciplina.nome}
            </strong>
            . A vaga será liberada e poderá ser ocupada por outro aluno.
          </p>
        </DialogoConfirmacao>
      )}
    </section>
  );
}
