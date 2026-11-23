import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Pagina } from '../api/aluno';
import { Carregando, ErroAoCarregar, ListaVazia, SemResultados } from './EstadoLista';
import { Paginacao } from './Paginacao';

interface ConteudoListaProps<T> {
  consulta: UseQueryResult<Pagina<T>>;
  busca: string;
  onLimparBusca: () => void;
  onMudarPagina: (pagina: number) => void;
  mensagemVazia: string;
  children: (items: T[]) => ReactNode;
}

/**
 * Trata, num lugar só, os estados de uma listagem paginada:
 * carregando, erro com "Tentar novamente", lista vazia, busca sem resultado,
 * página além da última e, por fim, os itens com a paginação.
 */
export function ConteudoLista<T>({
  consulta,
  busca,
  onLimparBusca,
  onMudarPagina,
  mensagemVazia,
  children,
}: ConteudoListaProps<T>) {
  if (consulta.isPending) return <Carregando />;
  if (consulta.isError) {
    return <ErroAoCarregar erro={consulta.error} onTentarNovamente={() => consulta.refetch()} />;
  }

  const { items, total, page, totalPages } = consulta.data;
  if (total === 0) {
    return busca ? (
      <SemResultados busca={busca} onLimpar={onLimparBusca} />
    ) : (
      <ListaVazia mensagem={mensagemVazia} />
    );
  }
  if (items.length === 0) {
    return (
      <div className="estado">
        <p>Esta página não tem itens.</p>
        <button type="button" className="botao" onClick={() => onMudarPagina(1)}>
          Ir para a primeira página
        </button>
      </div>
    );
  }

  return (
    <>
      {children(items)}
      <Paginacao pagina={page} totalPaginas={totalPages} total={total} onMudar={onMudarPagina} />
    </>
  );
}
