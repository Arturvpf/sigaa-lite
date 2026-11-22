import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Busca e página das listagens guardadas na URL (?q=&page=).
 * Assim a URL pode ser compartilhada/recarregada e o "voltar" do navegador funciona.
 * Mudar a busca volta para a página 1.
 */
export function useParametrosLista() {
  const [params, setParams] = useSearchParams();

  const busca = params.get('q') ?? '';
  const paginaBruta = Number(params.get('page'));
  const pagina = Number.isInteger(paginaBruta) && paginaBruta >= 1 ? paginaBruta : 1;

  const setBusca = useCallback(
    (q: string) => {
      setParams((atuais) => {
        const novos = new URLSearchParams(atuais);
        if (q) novos.set('q', q);
        else novos.delete('q');
        novos.delete('page');
        return novos;
      });
    },
    [setParams],
  );

  const setPagina = useCallback(
    (page: number) => {
      setParams((atuais) => {
        const novos = new URLSearchParams(atuais);
        if (page > 1) novos.set('page', String(page));
        else novos.delete('page');
        return novos;
      });
    },
    [setParams],
  );

  return { busca, pagina, setBusca, setPagina };
}
