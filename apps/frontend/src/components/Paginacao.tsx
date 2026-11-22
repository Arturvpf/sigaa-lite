interface PaginacaoProps {
  pagina: number;
  totalPaginas: number;
  total: number;
  onMudar: (pagina: number) => void;
}

/** Navegação entre páginas de uma listagem. Some quando há uma página só. */
export function Paginacao({ pagina, totalPaginas, total, onMudar }: PaginacaoProps) {
  if (totalPaginas <= 1) return null;

  return (
    <nav className="paginacao" aria-label="Paginação">
      <button
        type="button"
        className="botao"
        onClick={() => onMudar(pagina - 1)}
        disabled={pagina <= 1}
      >
        Anterior
      </button>
      <span aria-live="polite">
        Página {pagina} de {totalPaginas} <span className="texto-suave">({total} itens)</span>
      </span>
      <button
        type="button"
        className="botao"
        onClick={() => onMudar(pagina + 1)}
        disabled={pagina >= totalPaginas}
      >
        Próxima
      </button>
    </nav>
  );
}
