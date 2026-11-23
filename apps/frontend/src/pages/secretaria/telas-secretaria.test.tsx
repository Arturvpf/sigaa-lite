import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pagina } from '../../api/aluno';
import type { Disciplina, Professor, Turma } from '../../api/secretaria';
import { renderApp, respostaJson, sessaoSecretaria, simularApi } from '../../test/render-app';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

function pagina<T>(items: T[]): Pagina<T> {
  return { items, total: items.length, page: 1, pageSize: 10, totalPages: 1 };
}

const disciplinas: Disciplina[] = [
  { id: 1, codigo: 'IF668', nome: 'Introdução à Programação', ch: 60, preRequisitos: [] },
  { id: 2, codigo: 'IF671', nome: 'Banco de Dados', ch: 60, preRequisitos: [] },
];
const professores: Professor[] = [
  { id: 1, nome: 'Maria Souza', email: 'maria@exemplo.edu.br' },
  { id: 2, nome: 'Ricardo Alves', email: 'ricardo@exemplo.edu.br' },
];
const turmas: Turma[] = [
  {
    id: 7,
    vagas: 3,
    vagasOcupadas: 2,
    vagasDisponiveis: 1,
    disciplina: disciplinas[1]!,
    professor: { id: 2, nome: 'Ricardo Alves' },
  },
  {
    id: 8,
    vagas: 2,
    vagasOcupadas: 2,
    vagasDisponiveis: 0,
    disciplina: disciplinas[0]!,
    professor: { id: 1, nome: 'Maria Souza' },
  },
];

const janela = () => screen.getByRole('dialog');
const campo = (rotulo: string) => within(janela()).getByLabelText(rotulo);

describe('Disciplinas', () => {
  it('lista as disciplinas em tabela', async () => {
    simularApi(fetchMock, {
      'GET /secretaria/disciplinas': respostaJson(200, pagina(disciplinas)),
    });
    renderApp('/secretaria/disciplinas', { sessao: sessaoSecretaria });

    const linhas = await screen.findAllByRole('row');
    expect(linhas).toHaveLength(3); // cabeçalho + 2
    expect(within(linhas[2]!).getByText('Banco de Dados')).toBeInTheDocument();
  });

  it('valida a CH no formulário sem chamar a API (regra 2)', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /secretaria/disciplinas': respostaJson(200, pagina(disciplinas)),
    });
    renderApp('/secretaria/disciplinas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Nova disciplina' }));
    await userEvent.type(campo('Código'), 'IF999');
    await userEvent.type(campo('Nome'), 'Teste');
    await userEvent.type(campo('Carga horária (horas)'), '20');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Cadastrar' }));

    expect(campo('Carga horária (horas)')).toHaveAccessibleDescription(
      expect.stringContaining('múltipla de 15'),
    );
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false);
  });

  it('mostra no campo código a recusa por código duplicado (regra 1)', async () => {
    simularApi(fetchMock, {
      'GET /secretaria/disciplinas': respostaJson(200, pagina(disciplinas)),
      'POST /secretaria/disciplinas': respostaJson(409, {
        code: 'CODIGO_DUPLICADO',
        message: 'Já existe uma disciplina com o código IF668.',
      }),
    });
    renderApp('/secretaria/disciplinas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Nova disciplina' }));
    await userEvent.type(campo('Código'), 'if668');
    await userEvent.type(campo('Nome'), 'Duplicada');
    await userEvent.type(campo('Carga horária (horas)'), '60');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() =>
      expect(campo('Código')).toHaveAccessibleDescription(
        expect.stringContaining('Já existe uma disciplina com o código IF668.'),
      ),
    );
    expect(janela()).toBeInTheDocument();
  });

  it('cadastra, avisa e recarrega a lista', async () => {
    let listagens = 0;
    const chamadas = simularApi(fetchMock, {
      'GET /secretaria/disciplinas': () => {
        listagens++;
        return respostaJson(200, pagina(disciplinas));
      },
      'POST /secretaria/disciplinas': (corpo) => respostaJson(201, { id: 3, ...(corpo as object) }),
    });
    renderApp('/secretaria/disciplinas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Nova disciplina' }));
    await userEvent.type(campo('Código'), 'le500');
    await userEvent.type(campo('Nome'), 'Inglês Instrumental');
    await userEvent.type(campo('Carga horária (horas)'), '30');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('Disciplina LE500 cadastrada.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({
      codigo: 'LE500',
      nome: 'Inglês Instrumental',
      ch: 30,
    });
    await waitFor(() => expect(listagens).toBe(2));
  });

  it('edita com os valores atuais preenchidos', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /secretaria/disciplinas': respostaJson(200, pagina(disciplinas)),
      'PUT /secretaria/disciplinas/2': (corpo) =>
        respostaJson(200, { id: 2, ...(corpo as object) }),
    });
    renderApp('/secretaria/disciplinas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Editar IF671' }));
    expect(campo('Nome')).toHaveValue('Banco de Dados');
    await userEvent.clear(campo('Carga horária (horas)'));
    await userEvent.type(campo('Carga horária (horas)'), '90');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Disciplina IF671 atualizada.')).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === 'PUT')?.corpo).toEqual({
      codigo: 'IF671',
      nome: 'Banco de Dados',
      ch: 90,
    });
  });
});

describe('Professores', () => {
  it('valida o e-mail no formulário e mostra a recusa por e-mail duplicado (regra 3)', async () => {
    simularApi(fetchMock, {
      'GET /secretaria/professores': respostaJson(200, pagina(professores)),
      'POST /secretaria/professores': respostaJson(409, {
        code: 'EMAIL_DUPLICADO',
        message: 'Já existe um professor com o e-mail maria@exemplo.edu.br.',
      }),
    });
    renderApp('/secretaria/professores', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Novo professor' }));
    await userEvent.type(campo('Nome'), 'Maria');
    await userEvent.type(campo('E-mail'), 'maria@');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Cadastrar' }));
    expect(campo('E-mail')).toHaveAccessibleDescription('Informe um e-mail válido');

    await userEvent.type(campo('E-mail'), 'exemplo.edu.br');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() =>
      expect(campo('E-mail')).toHaveAccessibleDescription(
        'Já existe um professor com o e-mail maria@exemplo.edu.br.',
      ),
    );
  });
});

describe('Turmas', () => {
  it('lista vagas ocupadas e totais, destacando turma lotada', async () => {
    simularApi(fetchMock, { 'GET /secretaria/turmas': respostaJson(200, pagina(turmas)) });
    renderApp('/secretaria/turmas', { sessao: sessaoSecretaria });

    const [, bd, intro] = await screen.findAllByRole('row');
    expect(within(bd!).getByText('2 / 3')).toBeInTheDocument();
    expect(within(intro!).getByText('2 / 2')).toBeInTheDocument();
    expect(within(intro!).getByText('lotada')).toBeInTheDocument();
  });

  it('não deixa reduzir as vagas abaixo dos matriculados (regra 5)', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /secretaria/turmas': respostaJson(200, pagina(turmas)),
    });
    renderApp('/secretaria/turmas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Alterar vagas de IF671' }));
    expect(within(janela()).getByText(/2 aluno\(s\) matriculado\(s\)/)).toBeInTheDocument();
    await userEvent.clear(campo('Vagas'));
    await userEvent.type(campo('Vagas'), '1');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Salvar' }));

    expect(campo('Vagas')).toHaveAccessibleDescription(
      expect.stringContaining('não podem ficar abaixo disso'),
    );
    expect(chamadas.some((c) => c.metodo === 'PATCH')).toBe(false);
  });

  it('mostra a recusa da API quando alguém se matriculou enquanto a janela estava aberta', async () => {
    simularApi(fetchMock, {
      'GET /secretaria/turmas': respostaJson(200, pagina(turmas)),
      'PATCH /secretaria/turmas/7/vagas': respostaJson(422, {
        code: 'VAGAS_ABAIXO_DOS_MATRICULADOS',
        message: 'A turma já tem 3 aluno(s) matriculado(s); as vagas não podem ficar abaixo disso.',
        details: { matriculados: 3 },
      }),
    });
    renderApp('/secretaria/turmas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Alterar vagas de IF671' }));
    await userEvent.clear(campo('Vagas'));
    await userEvent.type(campo('Vagas'), '2');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(campo('Vagas')).toHaveAccessibleDescription(
        expect.stringContaining('A turma já tem 3 aluno(s) matriculado(s)'),
      ),
    );
  });

  it('abre turma escolhendo disciplina e professor', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /secretaria/turmas': respostaJson(200, pagina(turmas)),
      'GET /secretaria/disciplinas': respostaJson(200, pagina(disciplinas)),
      'GET /secretaria/professores': respostaJson(200, pagina(professores)),
      'POST /secretaria/turmas': respostaJson(201, { id: 9 }),
    });
    renderApp('/secretaria/turmas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Abrir turma' }));
    await waitFor(() => expect(campo('Disciplina')).toBeEnabled());
    await userEvent.selectOptions(campo('Disciplina'), 'IF668 — Introdução à Programação (60h)');
    await userEvent.selectOptions(campo('Professor'), 'Ricardo Alves');
    await userEvent.type(campo('Vagas'), '40');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Abrir turma' }));

    expect(await screen.findByText('Turma aberta.')).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({
      disciplinaId: 1,
      professorId: 2,
      vagas: 40,
    });
  });

  it('exige disciplina, professor e pelo menos 1 vaga (regra 4)', async () => {
    const chamadas = simularApi(fetchMock, {
      'GET /secretaria/turmas': respostaJson(200, pagina(turmas)),
      'GET /secretaria/disciplinas': respostaJson(200, pagina(disciplinas)),
      'GET /secretaria/professores': respostaJson(200, pagina(professores)),
    });
    renderApp('/secretaria/turmas', { sessao: sessaoSecretaria });

    await userEvent.click(await screen.findByRole('button', { name: 'Abrir turma' }));
    await waitFor(() => expect(campo('Disciplina')).toBeEnabled());
    await userEvent.type(campo('Vagas'), '0');
    await userEvent.click(within(janela()).getByRole('button', { name: 'Abrir turma' }));

    expect(campo('Disciplina')).toHaveAccessibleDescription('Escolha a disciplina');
    expect(campo('Professor')).toHaveAccessibleDescription('Escolha o professor');
    expect(campo('Vagas')).toHaveAccessibleDescription(
      expect.stringContaining('pelo menos 1 vaga'),
    );
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false);
  });
});
