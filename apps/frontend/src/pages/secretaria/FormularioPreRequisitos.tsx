import { useState } from 'react';
import { mensagemDeErro } from '../../api/errors';
import type { Disciplina } from '../../api/secretaria';
import { JanelaFormulario } from '../../components/JanelaFormulario';
import { useToast } from '../../components/toast/toast-context';
import { useDefinirPreRequisitos, useTodasDisciplinas } from '../../hooks/useSecretaria';

/**
 * Escolha dos pré-requisitos de uma disciplina (requisito à escolha).
 * Salva a lista inteira de uma vez. A própria disciplina não aparece como opção;
 * ciclos são recusados pela API e a mensagem aparece no formulário.
 */
export function FormularioPreRequisitos({
  disciplina,
  onFechar,
}: {
  disciplina: Disciplina;
  onFechar: () => void;
}) {
  const toast = useToast();
  const opcoes = useTodasDisciplinas();
  const definir = useDefinirPreRequisitos();
  const [selecionados, setSelecionados] = useState(
    () => new Set(disciplina.preRequisitos.map((p) => p.id)),
  );
  const [erroGeral, setErroGeral] = useState<string>();

  function alternar(id: number) {
    setSelecionados((atuais) => {
      const novos = new Set(atuais);
      if (novos.has(id)) novos.delete(id);
      else novos.add(id);
      return novos;
    });
    setErroGeral(undefined);
  }

  function enviar() {
    definir.mutate(
      { id: disciplina.id, preRequisitoIds: [...selecionados] },
      {
        onSuccess: (atualizada) => {
          toast.mostrar(
            atualizada.preRequisitos.length > 0
              ? `Pré-requisitos de ${disciplina.codigo}: ${atualizada.preRequisitos.map((p) => p.codigo).join(', ')}.`
              : `${disciplina.codigo} agora não tem pré-requisitos.`,
            'sucesso',
          );
          onFechar();
        },
        onError: (error) => setErroGeral(mensagemDeErro(error)),
      },
    );
  }

  const candidatas = opcoes.data?.items.filter((d) => d.id !== disciplina.id) ?? [];

  return (
    <JanelaFormulario
      titulo={`Pré-requisitos de ${disciplina.codigo}`}
      textoEnviar="Salvar pré-requisitos"
      enviando={definir.isPending}
      erroGeral={erroGeral ?? (opcoes.isError ? mensagemDeErro(opcoes.error) : undefined)}
      onEnviar={enviar}
      onFechar={onFechar}
    >
      <p className="texto-suave">
        Marque as disciplinas que o aluno precisa ter aprovado antes de cursar{' '}
        <strong>{disciplina.nome}</strong>.
      </p>

      {opcoes.isPending ? (
        <p role="status">Carregando disciplinas…</p>
      ) : (
        <fieldset className="lista-opcoes">
          <legend className="visualmente-oculto">Pré-requisitos</legend>
          {candidatas.map((d) => (
            <label key={d.id} className="opcao">
              <input
                type="checkbox"
                checked={selecionados.has(d.id)}
                onChange={() => alternar(d.id)}
              />
              <span>
                <span className="codigo">{d.codigo}</span> {d.nome}
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </JanelaFormulario>
  );
}
