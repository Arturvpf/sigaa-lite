import { useState } from 'react';
import { mensagemDeErro } from '../../api/errors';
import type { Disciplina } from '../../api/secretaria';
import { Campo } from '../../components/Campo';
import { CampoBusca } from '../../components/CampoBusca';
import { ConteudoLista } from '../../components/ConteudoLista';
import { JanelaFormulario } from '../../components/JanelaFormulario';
import { useToast } from '../../components/toast/toast-context';
import { errosDaApi, type ErrosDeCampo, validarDisciplina } from '../../forms/validacao';
import { useParametrosLista } from '../../hooks/useParametrosLista';
import { useDisciplinas, useSalvarDisciplina } from '../../hooks/useSecretaria';

/** null = fechado; 'nova' = cadastro; Disciplina = edição. */
type Formulario = null | 'nova' | Disciplina;

export function DisciplinasPage() {
  const { busca, pagina, setBusca, setPagina } = useParametrosLista();
  const disciplinas = useDisciplinas(busca, pagina);
  const [formulario, setFormulario] = useState<Formulario>(null);

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Disciplinas</h1>
        <button
          type="button"
          className="botao botao--primario"
          onClick={() => setFormulario('nova')}
        >
          Nova disciplina
        </button>
      </div>

      <div className="barra-ferramentas">
        <CampoBusca
          valor={busca}
          onBuscar={setBusca}
          rotulo="Buscar disciplina por código ou nome"
          placeholder="Buscar por código ou nome"
        />
      </div>

      <ConteudoLista
        consulta={disciplinas}
        busca={busca}
        onLimparBusca={() => setBusca('')}
        onMudarPagina={setPagina}
        mensagemVazia="Nenhuma disciplina cadastrada."
      >
        {(items) => (
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Nome</th>
                <th scope="col" className="tabela__numero">
                  CH
                </th>
                <th scope="col" className="tabela__acoes">
                  <span className="visualmente-oculto">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((disciplina) => (
                <tr key={disciplina.id}>
                  <td className="codigo">{disciplina.codigo}</td>
                  <td>{disciplina.nome}</td>
                  <td className="tabela__numero">{disciplina.ch}h</td>
                  <td className="tabela__acoes">
                    <button
                      type="button"
                      className="botao botao--discreto"
                      onClick={() => setFormulario(disciplina)}
                    >
                      Editar<span className="visualmente-oculto"> {disciplina.codigo}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ConteudoLista>

      {formulario && (
        <FormularioDisciplina
          disciplina={formulario === 'nova' ? undefined : formulario}
          onFechar={() => setFormulario(null)}
        />
      )}
    </section>
  );
}

function FormularioDisciplina({
  disciplina,
  onFechar,
}: {
  disciplina?: Disciplina;
  onFechar: () => void;
}) {
  const toast = useToast();
  const salvar = useSalvarDisciplina();
  const [valores, setValores] = useState({
    codigo: disciplina?.codigo ?? '',
    nome: disciplina?.nome ?? '',
    ch: disciplina ? String(disciplina.ch) : '',
  });
  const [erros, setErros] = useState<ErrosDeCampo>({});
  const [erroGeral, setErroGeral] = useState<string>();

  const alterar = (campo: keyof typeof valores) => (valor: string) => {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
    setErros((atuais) => ({ ...atuais, [campo]: '' }));
  };

  function enviar() {
    const errosLocais = validarDisciplina(valores);
    setErros(errosLocais);
    setErroGeral(undefined);
    if (Object.keys(errosLocais).length > 0) return;

    salvar.mutate(
      {
        id: disciplina?.id,
        codigo: valores.codigo,
        nome: valores.nome.trim(),
        ch: Number(valores.ch),
      },
      {
        onSuccess: (salva) => {
          toast.mostrar(
            disciplina
              ? `Disciplina ${salva.codigo} atualizada.`
              : `Disciplina ${salva.codigo} cadastrada.`,
            'sucesso',
          );
          onFechar();
        },
        onError: (error) => {
          const porCampo = errosDaApi(error);
          if (Object.keys(porCampo).length > 0) setErros(porCampo);
          else setErroGeral(mensagemDeErro(error));
        },
      },
    );
  }

  return (
    <JanelaFormulario
      titulo={disciplina ? `Editar ${disciplina.codigo}` : 'Nova disciplina'}
      textoEnviar={disciplina ? 'Salvar alterações' : 'Cadastrar'}
      enviando={salvar.isPending}
      erroGeral={erroGeral}
      onEnviar={enviar}
      onFechar={onFechar}
    >
      <Campo rotulo="Código" erro={erros.codigo} ajuda="Letras e números, ex.: IF668">
        {(a11y) => (
          <input
            {...a11y}
            autoFocus
            autoComplete="off"
            value={valores.codigo}
            onChange={(e) => alterar('codigo')(e.target.value.toUpperCase())}
          />
        )}
      </Campo>
      <Campo rotulo="Nome" erro={erros.nome}>
        {(a11y) => (
          <input {...a11y} value={valores.nome} onChange={(e) => alterar('nome')(e.target.value)} />
        )}
      </Campo>
      <Campo rotulo="Carga horária (horas)" erro={erros.ch} ajuda="Múltipla de 15, entre 15 e 120">
        {(a11y) => (
          <input
            {...a11y}
            type="number"
            inputMode="numeric"
            min={15}
            max={120}
            step={15}
            value={valores.ch}
            onChange={(e) => alterar('ch')(e.target.value)}
          />
        )}
      </Campo>
    </JanelaFormulario>
  );
}
