import { mensagemDeErro } from '../api/errors';

/** Indicador de carregamento acessível. */
export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="estado" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

/** Lista sem nenhum item (ainda não há dados). */
export function ListaVazia({ mensagem }: { mensagem: string }) {
  return (
    <div className="estado">
      <p>{mensagem}</p>
    </div>
  );
}

/** A busca não encontrou nada: diferente de lista vazia, oferece limpar a busca. */
export function SemResultados({ busca, onLimpar }: { busca: string; onLimpar: () => void }) {
  return (
    <div className="estado">
      <p>
        Nenhum resultado para <strong>“{busca}”</strong>.
      </p>
      <button type="button" className="botao" onClick={onLimpar}>
        Limpar busca
      </button>
    </div>
  );
}

/** Falha ao carregar, com botão para tentar de novo. */
export function ErroAoCarregar({
  erro,
  onTentarNovamente,
}: {
  erro: unknown;
  onTentarNovamente: () => void;
}) {
  return (
    <div className="estado estado--erro" role="alert">
      <p>{mensagemDeErro(erro)}</p>
      <button type="button" className="botao" onClick={onTentarNovamente}>
        Tentar novamente
      </button>
    </div>
  );
}
