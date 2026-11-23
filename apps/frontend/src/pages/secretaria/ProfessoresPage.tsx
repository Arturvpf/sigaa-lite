import { useState } from 'react';
import { mensagemDeErro } from '../../api/errors';
import { Campo } from '../../components/Campo';
import { Icone } from '../../components/Icone';
import { CampoBusca } from '../../components/CampoBusca';
import { ConteudoLista } from '../../components/ConteudoLista';
import { JanelaFormulario } from '../../components/JanelaFormulario';
import { useToast } from '../../components/toast/toast-context';
import { errosDaApi, type ErrosDeCampo, validarProfessor } from '../../forms/validacao';
import { useParametrosLista } from '../../hooks/useParametrosLista';
import { useCriarProfessor, useProfessores } from '../../hooks/useSecretaria';

export function ProfessoresPage() {
  const { busca, pagina, setBusca, setPagina } = useParametrosLista();
  const professores = useProfessores(busca, pagina);
  const [cadastrando, setCadastrando] = useState(false);

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Professores</h1>
        <button
          type="button"
          className="botao botao--primario"
          onClick={() => setCadastrando(true)}
        >
          <Icone nome="mais" />
          Novo professor
        </button>
      </div>

      <div className="barra-ferramentas">
        <CampoBusca
          valor={busca}
          onBuscar={setBusca}
          rotulo="Buscar professor por nome ou e-mail"
          placeholder="Buscar por nome ou e-mail"
        />
      </div>

      <ConteudoLista
        consulta={professores}
        busca={busca}
        onLimparBusca={() => setBusca('')}
        onMudarPagina={setPagina}
        mensagemVazia="Nenhum professor cadastrado."
      >
        {(items) => (
          <div className="tabela-caixa">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                </tr>
              </thead>
              <tbody>
                {items.map((professor) => (
                  <tr key={professor.id}>
                    <td>{professor.nome}</td>
                    <td>{professor.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConteudoLista>

      {cadastrando && <FormularioProfessor onFechar={() => setCadastrando(false)} />}
    </section>
  );
}

function FormularioProfessor({ onFechar }: { onFechar: () => void }) {
  const toast = useToast();
  const criar = useCriarProfessor();
  const [valores, setValores] = useState({ nome: '', email: '' });
  const [erros, setErros] = useState<ErrosDeCampo>({});
  const [erroGeral, setErroGeral] = useState<string>();

  const alterar = (campo: keyof typeof valores) => (valor: string) => {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
    setErros((atuais) => ({ ...atuais, [campo]: '' }));
  };

  function enviar() {
    const errosLocais = validarProfessor(valores);
    setErros(errosLocais);
    setErroGeral(undefined);
    if (Object.keys(errosLocais).length > 0) return;

    criar.mutate(
      { nome: valores.nome.trim(), email: valores.email.trim() },
      {
        onSuccess: (professor) => {
          toast.mostrar(`Professor(a) ${professor.nome} cadastrado(a).`, 'sucesso');
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
      titulo="Novo professor"
      textoEnviar="Cadastrar"
      enviando={criar.isPending}
      erroGeral={erroGeral}
      onEnviar={enviar}
      onFechar={onFechar}
    >
      <Campo rotulo="Nome" erro={erros.nome}>
        {(a11y) => (
          <input
            {...a11y}
            autoFocus
            value={valores.nome}
            onChange={(e) => alterar('nome')(e.target.value)}
          />
        )}
      </Campo>
      <Campo rotulo="E-mail" erro={erros.email}>
        {(a11y) => (
          <input
            {...a11y}
            type="email"
            autoComplete="off"
            value={valores.email}
            onChange={(e) => alterar('email')(e.target.value)}
          />
        )}
      </Campo>
    </JanelaFormulario>
  );
}
