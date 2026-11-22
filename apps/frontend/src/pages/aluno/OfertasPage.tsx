import { CampoBusca } from '../../components/CampoBusca';
import {
  Carregando,
  ErroAoCarregar,
  ListaVazia,
  SemResultados,
} from '../../components/EstadoLista';
import { Paginacao } from '../../components/Paginacao';
import { useMatricular, useOfertas } from '../../hooks/useAluno';
import { useParametrosLista } from '../../hooks/useParametrosLista';
import { OfertaCard } from './OfertaCard';

export function OfertasPage() {
  const { busca, pagina, setBusca, setPagina } = useParametrosLista();
  const ofertas = useOfertas(busca, pagina);
  const matricular = useMatricular();

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Ofertas do semestre</h1>
        {ofertas.isFetching && !ofertas.isPending && (
          <span className="texto-suave" role="status">
            Atualizando…
          </span>
        )}
      </div>

      <div className="barra-ferramentas">
        <CampoBusca
          valor={busca}
          onBuscar={setBusca}
          rotulo="Buscar disciplina por código ou nome"
          placeholder="Buscar por código ou nome (ex.: IF671)"
        />
      </div>

      {ofertas.isPending ? (
        <Carregando texto="Carregando ofertas…" />
      ) : ofertas.isError ? (
        <ErroAoCarregar erro={ofertas.error} onTentarNovamente={() => ofertas.refetch()} />
      ) : ofertas.data.total === 0 ? (
        busca ? (
          <SemResultados busca={busca} onLimpar={() => setBusca('')} />
        ) : (
          <ListaVazia mensagem="Nenhuma turma foi aberta neste semestre." />
        )
      ) : ofertas.data.items.length === 0 ? (
        // Página além da última (ex.: URL antiga depois de a lista diminuir)
        <div className="estado">
          <p>Esta página não tem ofertas.</p>
          <button type="button" className="botao" onClick={() => setPagina(1)}>
            Ir para a primeira página
          </button>
        </div>
      ) : (
        <>
          <ul className="lista" aria-label="Ofertas">
            {ofertas.data.items.map((oferta) => (
              <OfertaCard
                key={oferta.id}
                oferta={oferta}
                onMatricular={(turmaId) => matricular.mutate(turmaId)}
                matriculando={matricular.isPending && matricular.variables === oferta.id}
                bloqueado={matricular.isPending}
              />
            ))}
          </ul>
          <Paginacao
            pagina={ofertas.data.page}
            totalPaginas={ofertas.data.totalPages}
            total={ofertas.data.total}
            onMudar={setPagina}
          />
        </>
      )}
    </section>
  );
}
