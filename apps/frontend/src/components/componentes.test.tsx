import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';
import { CampoBusca } from './CampoBusca';
import { ErroAoCarregar, SemResultados } from './EstadoLista';
import { Paginacao } from './Paginacao';

describe('Paginacao', () => {
  it('desabilita "Anterior" na primeira página e "Próxima" na última', () => {
    const { rerender } = render(
      <Paginacao pagina={1} totalPaginas={3} total={25} onMudar={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled();

    rerender(<Paginacao pagina={3} totalPaginas={3} total={25} onMudar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('pede a página vizinha ao clicar', async () => {
    const onMudar = vi.fn();
    render(<Paginacao pagina={2} totalPaginas={3} total={25} onMudar={onMudar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(onMudar.mock.calls).toEqual([[3], [1]]);
  });

  it('não aparece quando há uma página só', () => {
    const { container } = render(
      <Paginacao pagina={1} totalPaginas={1} total={3} onMudar={() => {}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('CampoBusca', () => {
  it('só busca depois que o usuário para de digitar', () => {
    vi.useFakeTimers();
    const onBuscar = vi.fn();
    render(<CampoBusca valor="" onBuscar={onBuscar} esperaMs={400} />);
    const campo = screen.getByRole('searchbox');

    fireEvent.change(campo, { target: { value: 'IF' } });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.change(campo, { target: { value: 'IF67' } });
    act(() => vi.advanceTimersByTime(399));
    expect(onBuscar).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onBuscar).toHaveBeenCalledExactlyOnceWith('IF67');
    vi.useRealTimers();
  });

  it('acompanha a busca quando ela muda por fora (ex.: limpar busca)', () => {
    const { rerender } = render(<CampoBusca valor="redes" onBuscar={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('redes');

    rerender(<CampoBusca valor="" onBuscar={() => {}} />);

    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
});

describe('estados da lista', () => {
  it('erro ao carregar mostra a mensagem e permite tentar de novo', async () => {
    const tentar = vi.fn();
    render(
      <ErroAoCarregar
        erro={new ApiError(0, 'FALHA_DE_REDE', 'Não foi possível falar com o servidor.')}
        onTentarNovamente={tentar}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(tentar).toHaveBeenCalledOnce();
  });

  it('busca sem resultado mostra o termo e permite limpar', async () => {
    const limpar = vi.fn();
    render(<SemResultados busca="xyz" onLimpar={limpar} />);

    expect(screen.getByText('“xyz”')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(limpar).toHaveBeenCalledOnce();
  });
});
