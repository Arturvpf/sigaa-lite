import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Matricula, Oferta, Pagina, Progresso } from '../../api/aluno';
import { renderApp, respostaJson, sessaoAluno, simularApi } from '../../test/render-app';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

function oferta(parcial: Partial<Oferta> & { id: number; codigo: string }): Oferta {
  const { codigo, ...resto } = parcial;
  return {
    disciplina: { id: parcial.id, codigo, nome: `Disciplina ${codigo}`, ch: 60 },
    professor: { id: 1, nome: 'Maria Souza' },
    vagas: 30,
    vagasOcupadas: 0,
    vagasDisponiveis: 30,
    lotada: false,
    classificacao: 'OBRIGATORIA',
    matriculaId: null,
    jaAprovado: false,
    ...resto,
  };
}

function pagina<T>(items: T[], extra: Partial<Pagina<T>> = {}): Pagina<T> {
  return { items, total: items.length, page: 1, pageSize: 10, totalPages: 1, ...extra };
}

const ofertasPadrao = [
  oferta({ id: 1, codigo: 'IF671', classificacao: 'OBRIGATORIA', vagasDisponiveis: 12 }),
  oferta({
    id: 2,
    codigo: 'IF676',
    classificacao: 'ELETIVA_PERFIL',
    vagas: 2,
    vagasOcupadas: 2,
    vagasDisponiveis: 0,
    lotada: true,
  }),
  oferta({ id: 3, codigo: 'LE500', classificacao: 'ELETIVA_LIVRE', matriculaId: 40 }),
  oferta({ id: 4, codigo: 'IF668', jaAprovado: true }),
];

const cartaoDe = (codigo: string) =>
  screen.getByRole('heading', { name: new RegExp(codigo) }).closest('li') as HTMLElement;

describe('Ofertas', () => {
  it('mostra cada turma com vagas e a classificação para o aluno', async () => {
    simularApi(fetchMock, { 'GET /aluno/ofertas': respostaJson(200, pagina(ofertasPadrao)) });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    await screen.findByRole('heading', { name: /IF671/ });

    expect(within(cartaoDe('IF671')).getByText('Obrigatória')).toBeInTheDocument();
    expect(within(cartaoDe('IF671')).getByText(/12 vagas disponíveis/)).toBeInTheDocument();
    expect(within(cartaoDe('IF676')).getByText('Eletiva de perfil')).toBeInTheDocument();
    expect(within(cartaoDe('LE500')).getByText('Eletiva livre')).toBeInTheDocument();
  });

  it('sinaliza turma lotada, matrícula existente e disciplina já aprovada', async () => {
    simularApi(fetchMock, { 'GET /aluno/ofertas': respostaJson(200, pagina(ofertasPadrao)) });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });
    await screen.findByRole('heading', { name: /IF676/ });

    expect(within(cartaoDe('IF676')).getByText(/Turma lotada/)).toBeInTheDocument();
    expect(
      within(cartaoDe('IF676')).getByRole('button', { name: 'Sem vagas em IF676' }),
    ).toBeDisabled();
    expect(within(cartaoDe('LE500')).getByText(/Matriculado/)).toBeInTheDocument();
    expect(within(cartaoDe('IF668')).getByText('Já aprovado')).toBeInTheDocument();
    expect(within(cartaoDe('IF668')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('matricula, avisa o sucesso e recarrega as ofertas', async () => {
    let buscas = 0;
    const chamadas = simularApi(fetchMock, {
      'GET /aluno/ofertas': () => {
        buscas++;
        return respostaJson(200, pagina(ofertasPadrao));
      },
      'POST /aluno/matriculas': respostaJson(201, { id: 99 }),
    });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });
    await screen.findByRole('heading', { name: /IF671/ });

    await userEvent.click(
      within(cartaoDe('IF671')).getByRole('button', { name: 'Matricular em IF671' }),
    );

    expect(await screen.findByText('Matrícula realizada.')).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({ turmaId: 1 });
    await waitFor(() => expect(buscas).toBe(2));
  });

  it('mostra a mensagem da API quando a matrícula é recusada e atualiza a lista', async () => {
    let buscas = 0;
    simularApi(fetchMock, {
      'GET /aluno/ofertas': () => {
        buscas++;
        return respostaJson(200, pagina(ofertasPadrao));
      },
      'POST /aluno/matriculas': respostaJson(422, {
        code: 'TURMA_LOTADA',
        message: 'Esta turma não tem mais vagas disponíveis.',
      }),
    });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });
    await screen.findByRole('heading', { name: /IF671/ });

    await userEvent.click(
      within(cartaoDe('IF671')).getByRole('button', { name: 'Matricular em IF671' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta turma não tem mais vagas disponíveis.',
    );
    await waitFor(() => expect(buscas).toBe(2));
  });

  it('busca pelo texto digitado e reflete a busca na URL', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /aluno/ofertas': respostaJson(200, pagina(ofertasPadrao)),
    });
    const { router } = renderApp('/aluno/ofertas?page=2', { sessao: sessaoAluno });
    await screen.findByRole('heading', { name: /IF671/ });

    await userEvent.type(screen.getByRole('searchbox'), 'banco');

    await waitFor(() => expect(router.state.location.search).toBe('?q=banco'));
    await waitFor(() => expect(chamadas.at(-1)?.query).toBe('?q=banco&page=1&pageSize=10'));
  });

  it('pagina pela URL', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /aluno/ofertas': respostaJson(200, pagina(ofertasPadrao, { total: 14, totalPages: 2 })),
    });
    const { router } = renderApp('/aluno/ofertas', { sessao: sessaoAluno });
    await screen.findByRole('heading', { name: /IF671/ });

    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    expect(router.state.location.search).toBe('?page=2');
    await waitFor(() => expect(chamadas.at(-1)?.query).toContain('page=2'));
  });

  it('busca sem resultado oferece limpar a busca', async () => {
    simularApi(fetchMock, { 'GET /aluno/ofertas': respostaJson(200, pagina([])) });
    const { router } = renderApp('/aluno/ofertas?q=xyz', { sessao: sessaoAluno });

    await userEvent.click(await screen.findByRole('button', { name: 'Limpar busca' }));

    expect(router.state.location.search).toBe('');
  });

  it('sem turmas no semestre, mostra lista vazia', async () => {
    simularApi(fetchMock, { 'GET /aluno/ofertas': respostaJson(200, pagina([])) });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    expect(await screen.findByText('Nenhuma turma foi aberta neste semestre.')).toBeInTheDocument();
  });

  it('falha ao carregar mostra o erro e "Tentar novamente" recarrega', async () => {
    let tentativas = 0;
    simularApi(fetchMock, {
      'GET /aluno/ofertas': () =>
        ++tentativas === 1
          ? respostaJson(500, { code: 'ERRO_INTERNO', message: 'Erro interno do servidor.' })
          : respostaJson(200, pagina(ofertasPadrao)),
    });
    renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('heading', { name: /IF671/ })).toBeInTheDocument();
  });
});

describe('Minhas matrículas', () => {
  const matricula: Matricula = {
    id: 40,
    criadaEm: '2026-11-21T10:00:00.000Z',
    turma: {
      id: 3,
      disciplina: { id: 3, codigo: 'IF671', nome: 'Banco de Dados', ch: 60 },
      professor: { id: 1, nome: 'Ricardo Alves' },
    },
    classificacao: 'OBRIGATORIA',
  };

  it('pede confirmação antes de cancelar e não cancela ao voltar', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /aluno/matriculas': respostaJson(200, [matricula]),
    });
    renderApp('/aluno/matriculas', { sessao: sessaoAluno });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar matrícula em IF671' }),
    );
    const dialogo = screen.getByRole('alertdialog', { name: 'Cancelar matrícula?' });
    expect(dialogo).toHaveTextContent('IF671 — Banco de Dados');

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Voltar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false);
  });

  it('cancela após confirmar, avisa e atualiza a lista', async () => {
    let lista = [matricula];
    const chamadas = simularApi(fetchMock, {
      'GET /aluno/matriculas': () => respostaJson(200, lista),
      'DELETE /aluno/matriculas/40': () => {
        lista = [];
        return new Response(null, { status: 204 });
      },
    });
    renderApp('/aluno/matriculas', { sessao: sessaoAluno });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar matrícula em IF671' }),
    );
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar matrícula' }),
    );

    expect(await screen.findByText(/Matrícula cancelada/)).toBeInTheDocument();
    expect(
      await screen.findByText('Você não tem matrículas ativas neste semestre.'),
    ).toBeInTheDocument();
    expect(
      chamadas.some((c) => c.metodo === 'DELETE' && c.caminho === '/aluno/matriculas/40'),
    ).toBe(true);
  });

  it('sem matrículas, convida a ver as ofertas', async () => {
    simularApi(fetchMock, { 'GET /aluno/matriculas': respostaJson(200, []) });
    renderApp('/aluno/matriculas', { sessao: sessaoAluno });

    expect(await screen.findByRole('link', { name: 'Ver ofertas' })).toHaveAttribute(
      'href',
      '/aluno/ofertas',
    );
  });
});

describe('Progresso', () => {
  const progresso: Progresso = {
    curso: { id: 1, nome: 'Ciência da Computação' },
    grupos: [
      {
        grupo: 'OBRIGATORIA',
        chExigida: 360,
        chIntegralizada: 180,
        chEmCurso: 120,
        chFaltante: 180,
        percentual: 50,
      },
      {
        grupo: 'ELETIVA_PERFIL',
        chExigida: 120,
        chIntegralizada: 120,
        chEmCurso: 0,
        chFaltante: 0,
        percentual: 100,
      },
      {
        grupo: 'ELETIVA_LIVRE',
        chExigida: 60,
        chIntegralizada: 45,
        chEmCurso: 0,
        chFaltante: 15,
        percentual: 75,
      },
    ],
  };

  it('mostra CH exigida, integralizada, em curso e faltante de cada grupo', async () => {
    simularApi(fetchMock, { 'GET /aluno/progresso': respostaJson(200, progresso) });
    renderApp('/aluno/progresso', { sessao: sessaoAluno });

    const obrigatorias = (await screen.findByRole('heading', { name: 'Obrigatória' })).closest(
      'li',
    ) as HTMLElement;
    expect(within(obrigatorias).getByText('Exigida').nextSibling).toHaveTextContent('360h');
    expect(within(obrigatorias).getByText('Integralizada').nextSibling).toHaveTextContent('180h');
    expect(within(obrigatorias).getByText('Em curso').nextSibling).toHaveTextContent('120h');
    expect(within(obrigatorias).getByText('Falta').nextSibling).toHaveTextContent('180h');
    expect(within(obrigatorias).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('grupo completo aparece como concluído', async () => {
    simularApi(fetchMock, { 'GET /aluno/progresso': respostaJson(200, progresso) });
    renderApp('/aluno/progresso', { sessao: sessaoAluno });

    const perfil = (await screen.findByRole('heading', { name: 'Eletiva de perfil' })).closest(
      'li',
    ) as HTMLElement;
    expect(within(perfil).getByText('Concluído')).toBeInTheDocument();
    expect(within(perfil).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
