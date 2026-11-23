import { useState } from 'react';
import { mensagemDeErro } from '../../api/errors';
import type { Turma } from '../../api/secretaria';
import { BarraOcupacao } from '../../components/BarraOcupacao';
import { Campo } from '../../components/Campo';
import { Icone } from '../../components/Icone';
import { CampoBusca } from '../../components/CampoBusca';
import { ConteudoLista } from '../../components/ConteudoLista';
import { JanelaFormulario } from '../../components/JanelaFormulario';
import { useToast } from '../../components/toast/toast-context';
import { errosDaApi, type ErrosDeCampo, validarVagas } from '../../forms/validacao';
import { useParametrosLista } from '../../hooks/useParametrosLista';
import {
  useAbrirTurma,
  useAlterarVagas,
  useOpcoesTurma,
  useTurmas,
} from '../../hooks/useSecretaria';

export function TurmasPage() {
  const { busca, pagina, setBusca, setPagina } = useParametrosLista();
  const turmas = useTurmas(busca, pagina);
  const [abrindo, setAbrindo] = useState(false);
  const [alterando, setAlterando] = useState<Turma | null>(null);

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Turmas</h1>
        <button type="button" className="botao botao--primario" onClick={() => setAbrindo(true)}>
          <Icone nome="mais" />
          Abrir turma
        </button>
      </div>

      <div className="barra-ferramentas">
        <CampoBusca
          valor={busca}
          onBuscar={setBusca}
          rotulo="Buscar turma por disciplina ou professor"
          placeholder="Buscar por disciplina ou professor"
        />
      </div>

      <ConteudoLista
        consulta={turmas}
        busca={busca}
        onLimparBusca={() => setBusca('')}
        onMudarPagina={setPagina}
        mensagemVazia="Nenhuma turma aberta neste semestre."
      >
        {(items) => (
          <div className="tabela-caixa">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Disciplina</th>
                  <th scope="col">Professor</th>
                  <th scope="col" className="tabela__ocupacao">
                    Ocupação (ocupadas / total)
                  </th>
                  <th scope="col" className="tabela__acoes">
                    <span className="visualmente-oculto">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((turma) => (
                  <tr key={turma.id}>
                    <td>
                      <span className="codigo">{turma.disciplina.codigo}</span>{' '}
                      {turma.disciplina.nome}
                    </td>
                    <td>{turma.professor.nome}</td>
                    <td className="tabela__ocupacao">
                      <div className="ocupacao-linha">
                        <BarraOcupacao
                          ocupadas={turma.vagasOcupadas}
                          vagas={turma.vagas}
                          disponiveis={turma.vagasDisponiveis}
                        />
                        <span className="ocupacao-linha__numeros">
                          {turma.vagasOcupadas} / {turma.vagas}
                        </span>
                        {turma.vagasDisponiveis === 0 && (
                          <span className="etiqueta-lotada">Lotada</span>
                        )}
                      </div>
                    </td>
                    <td className="tabela__acoes">
                      <button
                        type="button"
                        className="botao botao--discreto"
                        onClick={() => setAlterando(turma)}
                        aria-label={`Alterar vagas de ${turma.disciplina.codigo}`}
                      >
                        Alterar vagas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConteudoLista>

      {abrindo && <FormularioAbrirTurma onFechar={() => setAbrindo(false)} />}
      {alterando && <FormularioVagas turma={alterando} onFechar={() => setAlterando(null)} />}
    </section>
  );
}

function FormularioAbrirTurma({ onFechar }: { onFechar: () => void }) {
  const toast = useToast();
  const abrir = useAbrirTurma();
  const { disciplinas, professores } = useOpcoesTurma(true);
  const [valores, setValores] = useState({ disciplinaId: '', professorId: '', vagas: '' });
  const [erros, setErros] = useState<ErrosDeCampo>({});
  const [erroGeral, setErroGeral] = useState<string>();

  const alterar = (campo: keyof typeof valores) => (valor: string) => {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
    setErros((atuais) => ({ ...atuais, [campo]: '' }));
  };

  function enviar() {
    const errosLocais: ErrosDeCampo = {};
    if (!valores.disciplinaId) errosLocais.disciplinaId = 'Escolha a disciplina';
    if (!valores.professorId) errosLocais.professorId = 'Escolha o professor';
    const erroVagas = validarVagas(valores.vagas);
    if (erroVagas) errosLocais.vagas = erroVagas;
    setErros(errosLocais);
    setErroGeral(undefined);
    if (Object.keys(errosLocais).length > 0) return;

    abrir.mutate(
      {
        disciplinaId: Number(valores.disciplinaId),
        professorId: Number(valores.professorId),
        vagas: Number(valores.vagas),
      },
      {
        onSuccess: () => {
          toast.mostrar('Turma aberta.', 'sucesso');
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

  const carregandoOpcoes = disciplinas.isPending || professores.isPending;
  const erroOpcoes = disciplinas.error ?? professores.error;

  return (
    <JanelaFormulario
      titulo="Abrir turma"
      textoEnviar="Abrir turma"
      enviando={abrir.isPending}
      erroGeral={erroGeral ?? (erroOpcoes ? mensagemDeErro(erroOpcoes) : undefined)}
      onEnviar={enviar}
      onFechar={onFechar}
    >
      <Campo rotulo="Disciplina" erro={erros.disciplinaId}>
        {(a11y) => (
          <select
            {...a11y}
            autoFocus
            disabled={carregandoOpcoes}
            value={valores.disciplinaId}
            onChange={(e) => alterar('disciplinaId')(e.target.value)}
          >
            <option value="">{carregandoOpcoes ? 'Carregando…' : 'Selecione…'}</option>
            {disciplinas.data?.items.map((d) => (
              <option key={d.id} value={d.id}>
                {d.codigo} — {d.nome} ({d.ch}h)
              </option>
            ))}
          </select>
        )}
      </Campo>
      <Campo rotulo="Professor" erro={erros.professorId}>
        {(a11y) => (
          <select
            {...a11y}
            disabled={carregandoOpcoes}
            value={valores.professorId}
            onChange={(e) => alterar('professorId')(e.target.value)}
          >
            <option value="">{carregandoOpcoes ? 'Carregando…' : 'Selecione…'}</option>
            {professores.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}
      </Campo>
      <Campo rotulo="Vagas" erro={erros.vagas} ajuda="Pelo menos 1">
        {(a11y) => (
          <input
            {...a11y}
            type="number"
            inputMode="numeric"
            min={1}
            value={valores.vagas}
            onChange={(e) => alterar('vagas')(e.target.value)}
          />
        )}
      </Campo>
    </JanelaFormulario>
  );
}

function FormularioVagas({ turma, onFechar }: { turma: Turma; onFechar: () => void }) {
  const toast = useToast();
  const alterarVagas = useAlterarVagas();
  const [vagas, setVagas] = useState(String(turma.vagas));
  const [erro, setErro] = useState<string>();
  const [erroGeral, setErroGeral] = useState<string>();
  // Mínimo permitido (regra 5): o número de matriculados, mas nunca menos que 1
  const minimo = Math.max(1, turma.vagasOcupadas);

  function enviar() {
    const erroLocal = validarVagas(vagas, minimo);
    setErro(erroLocal);
    setErroGeral(undefined);
    if (erroLocal) return;

    alterarVagas.mutate(
      { id: turma.id, vagas: Number(vagas) },
      {
        onSuccess: () => {
          toast.mostrar(`Vagas de ${turma.disciplina.codigo} alteradas para ${vagas}.`, 'sucesso');
          onFechar();
        },
        onError: (error) => {
          const porCampo = errosDaApi(error);
          if (porCampo.vagas) setErro(porCampo.vagas);
          else setErroGeral(mensagemDeErro(error));
        },
      },
    );
  }

  return (
    <JanelaFormulario
      titulo={`Alterar vagas — ${turma.disciplina.codigo}`}
      textoEnviar="Salvar"
      enviando={alterarVagas.isPending}
      erroGeral={erroGeral}
      onEnviar={enviar}
      onFechar={onFechar}
    >
      <p className="texto-suave">
        {turma.disciplina.nome} · {turma.professor.nome}
        <br />
        {turma.vagasOcupadas} aluno(s) matriculado(s) hoje.
      </p>
      <Campo
        rotulo="Vagas"
        erro={erro}
        ajuda={`Mínimo: ${minimo} (não pode ficar abaixo dos matriculados)`}
      >
        {(a11y) => (
          <input
            {...a11y}
            autoFocus
            type="number"
            inputMode="numeric"
            min={minimo}
            value={vagas}
            onChange={(e) => {
              setVagas(e.target.value);
              setErro(undefined);
            }}
          />
        )}
      </Campo>
    </JanelaFormulario>
  );
}
