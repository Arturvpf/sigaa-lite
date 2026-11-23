import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Oferta, Progresso } from '../../api/aluno';
import { renderApp, respostaJson, sessaoAluno, simularApi } from '../../test/render-app';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

const redes: Oferta = {
  id: 5,
  disciplina: { id: 6, codigo: 'IF673', nome: 'Redes de Computadores', ch: 60 },
  professor: { id: 4, nome: 'Fernando Lima' },
  vagas: 30,
  vagasOcupadas: 0,
  vagasDisponiveis: 30,
  lotada: false,
  classificacao: 'ELETIVA_PERFIL',
  matriculaId: null,
  jaAprovado: false,
  preRequisitos: [],
};

function progressoComPerfil(integralizada: number): Progresso {
  return {
    curso: { id: 1, nome: 'Ciência da Computação' },
    grupos: [
      {
        grupo: 'ELETIVA_PERFIL',
        chExigida: 120,
        chIntegralizada: integralizada,
        chEmCurso: 0,
        chFaltante: 120 - integralizada,
        percentual: Math.floor((integralizada / 120) * 100),
      },
    ],
  };
}

const pagina = (items: Oferta[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 10,
  totalPages: 1,
});

async function abrirConfirmacao() {
  await userEvent.click(await screen.findByRole('button', { name: 'Matricular em IF673' }));
  return screen.getByRole('dialog', { name: 'IF673 · Redes de Computadores' });
}

describe('confirmação de matrícula', () => {
  it('resume a turma antes de matricular e não chama a API até confirmar', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /aluno/ofertas': respostaJson(200, pagina([redes])),
      'GET /aluno/progresso': respostaJson(200, progressoComPerfil(30)),
    });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    const dialogo = await abrirConfirmacao();

    expect(within(dialogo).getByText('Professor').nextSibling).toHaveTextContent('Fernando Lima');
    expect(within(dialogo).getByText('Carga horária').nextSibling).toHaveTextContent('60h');
    expect(within(dialogo).getByText('Vagas').nextSibling).toHaveTextContent('30 de 30 livres');
    expect(within(dialogo).getByText('Pré-requisitos').nextSibling).toHaveTextContent('Nenhum');
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false);
  });

  it('"Voltar" e Esc fecham sem matricular', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /aluno/ofertas': respostaJson(200, pagina([redes])),
      'GET /aluno/progresso': respostaJson(200, progressoComPerfil(30)),
    });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    const dialogo = await abrirConfirmacao();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await abrirConfirmacao();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false);
  });

  it('confirma e matricula na turma escolhida', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /aluno/ofertas': respostaJson(200, pagina([redes])),
      'GET /aluno/progresso': respostaJson(200, progressoComPerfil(30)),
      'POST /aluno/matriculas': respostaJson(201, { id: 99 }),
    });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    const dialogo = await abrirConfirmacao();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar matrícula' }));

    expect(await screen.findByText('Matrícula realizada.')).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({ turmaId: 5 });
  });

  describe('como conta no progresso', () => {
    it('eletiva de perfil com espaço conta como perfil', async () => {
      simularApi(fetchMock, {
        'GET /aluno/ofertas': respostaJson(200, pagina([redes])),
        'GET /aluno/progresso': respostaJson(200, progressoComPerfil(30)),
      });
      renderApp('/aluno/ofertas', { sessao: sessaoAluno });

      const dialogo = await abrirConfirmacao();

      await waitFor(() =>
        expect(within(dialogo).getByRole('note')).toHaveTextContent(
          'as 60h contam nas eletivas de perfil',
        ),
      );
    });

    it('com o perfil já completo, avisa que conta como eletiva livre (regra 11)', async () => {
      simularApi(fetchMock, {
        'GET /aluno/ofertas': respostaJson(200, pagina([redes])),
        'GET /aluno/progresso': respostaJson(200, progressoComPerfil(120)),
      });
      renderApp('/aluno/ofertas', { sessao: sessaoAluno });

      const dialogo = await abrirConfirmacao();

      await waitFor(() =>
        expect(within(dialogo).getByRole('note')).toHaveTextContent(
          'estas 60h vão contar como eletiva livre',
        ),
      );
    });

    it('obrigatória diz que conta nas obrigatórias do curso do aluno', async () => {
      simularApi(fetchMock, {
        'GET /aluno/ofertas': respostaJson(
          200,
          pagina([{ ...redes, classificacao: 'OBRIGATORIA' }]),
        ),
        'GET /aluno/progresso': respostaJson(200, progressoComPerfil(0)),
      });
      renderApp('/aluno/ofertas', { sessao: sessaoAluno });

      const dialogo = await abrirConfirmacao();

      await waitFor(() =>
        expect(within(dialogo).getByRole('note')).toHaveTextContent(
          'É obrigatória em Ciência da Computação',
        ),
      );
    });
  });
});
