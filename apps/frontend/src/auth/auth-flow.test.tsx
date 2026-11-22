import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderApp,
  respostaJson,
  sessaoAluno,
  sessaoSecretaria,
  simularApi,
} from '../test/render-app';
import { sessaoStorage } from './session';

const fetchMock = vi.fn<typeof fetch>();

/** Respostas mínimas das telas do aluno, para as rotas carregarem. */
const apiAluno = {
  'GET /aluno/ofertas': respostaJson(200, {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  }),
  'GET /aluno/matriculas': respostaJson(200, []),
  'GET /aluno/progresso': respostaJson(200, {
    curso: { id: 1, nome: 'Ciência da Computação' },
    grupos: [],
  }),
};

const loginAluno = {
  'POST /auth/login': respostaJson(200, {
    token: 'novo-token',
    expiresIn: 3600,
    usuario: sessaoAluno.usuario,
  }),
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  simularApi(fetchMock, apiAluno);
});

describe('guardas de rota', () => {
  it('sem sessão, uma área protegida leva ao login', async () => {
    const { router } = renderApp('/aluno/ofertas');

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('aluno não acessa a área da secretaria', async () => {
    renderApp('/secretaria/turmas', { sessao: sessaoAluno });

    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para a minha área' })).toHaveAttribute(
      'href',
      '/aluno/ofertas',
    );
  });

  it('secretaria não acessa a área do aluno', async () => {
    renderApp('/aluno/progresso', { sessao: sessaoSecretaria });

    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
  });

  it('com o perfil certo, mostra a área com o nome do usuário', async () => {
    renderApp('/aluno/progresso', { sessao: sessaoAluno });

    expect(await screen.findByRole('heading', { name: 'Progresso no curso' })).toBeInTheDocument();
    expect(screen.getByText('Ana Beatriz Lima')).toBeInTheDocument();
  });

  it('a raiz leva cada perfil para a sua área', async () => {
    const { router } = renderApp('/', { sessao: sessaoSecretaria });

    expect(await screen.findByRole('heading', { name: 'Disciplinas' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/secretaria/disciplinas');
  });
});

describe('login', () => {
  it('entra com o nome de usuário e vai para a área do perfil', async () => {
    const chamadas = simularApi(fetchMock, { ...apiAluno, ...loginAluno });
    const { router } = renderApp('/login');

    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'ana');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Ofertas do semestre' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/aluno/ofertas');
    expect(sessaoStorage.ler()?.token).toBe('novo-token');
    expect(chamadas[0]).toMatchObject({ metodo: 'POST', corpo: { username: 'ana' } });
  });

  it('volta para a página que o usuário tentou abrir antes do login', async () => {
    simularApi(fetchMock, { ...apiAluno, ...loginAluno });
    const { router } = renderApp('/aluno/progresso');

    await userEvent.type(await screen.findByLabelText('Nome de usuário'), 'ana');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Progresso no curso' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/aluno/progresso');
  });

  it('mostra a mensagem da API quando o login é recusado', async () => {
    simularApi(fetchMock, {
      'POST /auth/login': respostaJson(401, {
        code: 'CREDENCIAIS_INVALIDAS',
        message: 'Usuário ou senha inválidos.',
      }),
    });
    renderApp('/login');

    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'fantasma');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha inválidos.');
  });

  it('mostra mensagem de falha de comunicação quando o servidor não responde', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderApp('/login');

    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'ana');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível falar com o servidor',
    );
  });

  it('não envia com o nome de usuário em branco', async () => {
    renderApp('/login');

    await userEvent.type(screen.getByLabelText('Nome de usuário'), '   ');

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });
});

describe('fim da sessão', () => {
  it('o botão Sair encerra a sessão e volta ao login', async () => {
    const { router } = renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(sessaoStorage.ler()).toBeNull();
  });

  it('sessão expirada (401 da API) leva ao login com aviso', async () => {
    simularApi(fetchMock, {
      'GET /aluno/ofertas': respostaJson(401, {
        code: 'TOKEN_EXPIRADO',
        message: 'Sua sessão expirou.',
      }),
    });

    const { router } = renderApp('/aluno/ofertas', { sessao: sessaoAluno });

    expect(await screen.findByText(/Sua sessão expirou/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(sessaoStorage.ler()).toBeNull();
  });
});
