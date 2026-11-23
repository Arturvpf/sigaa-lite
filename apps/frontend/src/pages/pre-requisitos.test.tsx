import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Oferta } from '../api/aluno';
import type { Disciplina } from '../api/secretaria';
import {
  renderApp,
  respostaJson,
  sessaoAluno,
  sessaoSecretaria,
  simularApi,
} from '../test/render-app';

/** Requisito à escolha: pré-requisitos nas telas do aluno e da secretaria. */
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

const pagina = <T,>(items: T[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 10,
  totalPages: 1,
});

describe('ofertas com pré-requisitos', () => {
  const compiladores: Oferta = {
    id: 5,
    disciplina: { id: 11, codigo: 'IF678', nome: 'Compiladores', ch: 60 },
    professor: { id: 1, nome: 'Maria Souza' },
    vagas: 30,
    vagasOcupadas: 0,
    vagasDisponiveis: 30,
    lotada: false,
    classificacao: 'OBRIGATORIA',
    matriculaId: null,
    jaAprovado: false,
    preRequisitos: [
      { id: 2, codigo: 'IF669', nome: 'Algoritmos', atendido: false },
      { id: 3, codigo: 'IF670', nome: 'Matemática Discreta', atendido: true },
    ],
  };

  it('mostra cada pré-requisito como aprovado ou pendente e bloqueia a matrícula', async () => {
    simularApi(fetchMock, { 'GET /aluno/ofertas': respostaJson(200, pagina([compiladores])) });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    const cartao = (await screen.findByRole('heading', { name: /IF678/ })).closest(
      'li',
    ) as HTMLElement;

    expect(within(cartao).getByText(/IF669/)).toHaveTextContent('IF669 (pendente)');
    expect(within(cartao).getByText(/IF670/)).toHaveTextContent('IF670 (aprovado)');
    expect(
      within(cartao).getByRole('button', { name: 'Pré-requisito pendente em IF678' }),
    ).toBeDisabled();
  });

  it('com todos os pré-requisitos atendidos, permite matricular', async () => {
    const atendida = {
      ...compiladores,
      preRequisitos: compiladores.preRequisitos.map((p) => ({ ...p, atendido: true })),
    };
    simularApi(fetchMock, { 'GET /aluno/ofertas': respostaJson(200, pagina([atendida])) });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    expect(await screen.findByRole('button', { name: 'Matricular em IF678' })).toBeEnabled();
  });
});

describe('secretaria define pré-requisitos', () => {
  const disciplinas: Disciplina[] = [
    { id: 1, codigo: 'IF668', nome: 'Introdução à Programação', ch: 60, preRequisitos: [] },
    {
      id: 2,
      codigo: 'IF669',
      nome: 'Algoritmos',
      ch: 60,
      preRequisitos: [{ id: 1, codigo: 'IF668', nome: 'Introdução à Programação' }],
    },
    { id: 3, codigo: 'IF671', nome: 'Banco de Dados', ch: 60, preRequisitos: [] },
  ];

  it('mostra os pré-requisitos na tabela', async () => {
    simularApi(fetchMock, {
      'GET /secretaria/disciplinas': respostaJson(200, pagina(disciplinas)),
    });
    renderApp('/secretaria/disciplinas', { sessao: sessaoSecretaria });

    const linha = (await screen.findByText('Algoritmos')).closest('tr') as HTMLElement;
    expect(within(linha).getByText('IF668')).toBeInTheDocument();
  });

  it('marca os atuais, não oferece a própria disciplina e envia a nova lista', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /secretaria/disciplinas': respostaJson(200, pagina(disciplinas)),
      'PUT /secretaria/disciplinas/2/pre-requisitos': respostaJson(200, {
        ...disciplinas[1],
        preRequisitos: [
          { id: 1, codigo: 'IF668', nome: 'Introdução à Programação' },
          { id: 3, codigo: 'IF671', nome: 'Banco de Dados' },
        ],
      }),
    });
    renderApp('/secretaria/disciplinas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Pré-requisitos de IF669' }));
    const janela = screen.getByRole('dialog', { name: 'Pré-requisitos de IF669' });
    const intro = await within(janela).findByRole('checkbox', { name: /IF668/ });

    expect(intro).toBeChecked();
    expect(within(janela).queryByRole('checkbox', { name: /IF669/ })).not.toBeInTheDocument();

    await userEvent.click(within(janela).getByRole('checkbox', { name: /IF671/ }));
    await userEvent.click(within(janela).getByRole('button', { name: 'Salvar pré-requisitos' }));

    expect(await screen.findByText('Pré-requisitos de IF669: IF668, IF671.')).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === 'PUT')?.corpo).toEqual({ preRequisitoIds: [1, 3] });
  });

  it('mostra a recusa por ciclo no formulário', async () => {
    simularApi(fetchMock, {
      'GET /secretaria/disciplinas': respostaJson(200, pagina(disciplinas)),
      'PUT /secretaria/disciplinas/1/pre-requisitos': respostaJson(422, {
        code: 'PRE_REQUISITO_CICLICO',
        message: 'Esses pré-requisitos criariam um ciclo.',
      }),
    });
    renderApp('/secretaria/disciplinas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Pré-requisitos de IF668' }));
    const janela = screen.getByRole('dialog');
    await userEvent.click(await within(janela).findByRole('checkbox', { name: /IF669/ }));
    await userEvent.click(within(janela).getByRole('button', { name: 'Salvar pré-requisitos' }));

    await waitFor(() =>
      expect(within(janela).getByRole('alert')).toHaveTextContent(
        'Esses pré-requisitos criariam um ciclo.',
      ),
    );
  });
});
