import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render-app';
import { useParametrosLista } from './useParametrosLista';

function Exemplo() {
  const { busca, pagina, setBusca, setPagina } = useParametrosLista();
  return (
    <div>
      <p>
        busca={busca} pagina={pagina}
      </p>
      <button onClick={() => setPagina(pagina + 1)}>próxima</button>
      <button onClick={() => setBusca('redes')}>buscar</button>
      <button onClick={() => setBusca('')}>limpar</button>
    </div>
  );
}

const rotas = [{ path: '/lista', element: <Exemplo /> }];

describe('useParametrosLista', () => {
  it('lê busca e página da URL', () => {
    renderApp('/lista?q=IF6&page=3', { rotas });

    expect(screen.getByText('busca=IF6 pagina=3')).toBeInTheDocument();
  });

  it('usa página 1 quando a página da URL é inválida', () => {
    renderApp('/lista?page=abc', { rotas });

    expect(screen.getByText('busca= pagina=1')).toBeInTheDocument();
  });

  it('grava a página na URL e volta para a página 1 ao mudar a busca', async () => {
    const { router } = renderApp('/lista?page=2', { rotas });

    await userEvent.click(screen.getByRole('button', { name: 'próxima' }));
    expect(router.state.location.search).toBe('?page=3');

    await userEvent.click(screen.getByRole('button', { name: 'buscar' }));
    expect(router.state.location.search).toBe('?q=redes');

    await userEvent.click(screen.getByRole('button', { name: 'limpar' }));
    expect(router.state.location.search).toBe('');
  });
});
