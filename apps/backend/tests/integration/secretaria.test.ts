import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { setupIntegration, tokenDe } from './test-context.js';

const { app, prisma, fabrica } = setupIntegration();

let auth: { Authorization: string };

beforeEach(async () => {
  await fabrica.secretaria();
  auth = { Authorization: `Bearer ${await tokenDe(app, 'secretaria')}` };
});

const post = (url: string, body: object) => request(app).post(url).set(auth).send(body);

describe('acesso às rotas da secretaria', () => {
  it('responde 401 sem token e 403 para aluno', async () => {
    const curso = await fabrica.curso();
    await fabrica.aluno('ana', curso.id);
    const tokenAluno = await tokenDe(app, 'ana');

    const semToken = await request(app).get('/secretaria/disciplinas');
    const aluno = await request(app)
      .get('/secretaria/disciplinas')
      .set({ Authorization: `Bearer ${tokenAluno}` });

    expect(semToken.status).toBe(401);
    expect(aluno.status).toBe(403);
  });
});

describe('disciplinas', () => {
  it('cadastra com código normalizado em maiúsculas', async () => {
    const res = await post('/secretaria/disciplinas', {
      codigo: ' if 668 ',
      nome: 'Introdução à Programação',
      ch: 60,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      codigo: 'IF668',
      nome: 'Introdução à Programação',
      ch: 60,
      preRequisitos: [],
    });
  });

  it('recusa código duplicado com 409 CODIGO_DUPLICADO (regra 1)', async () => {
    await fabrica.disciplina('IF668');

    const res = await post('/secretaria/disciplinas', { codigo: 'if668', nome: 'Outra', ch: 60 });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      code: 'CODIGO_DUPLICADO',
      message: 'Já existe uma disciplina com o código IF668.',
    });
  });

  it.each([10, 20, 125, 0, 7.5])(
    'recusa CH %s com 400 e o motivo no campo ch (regra 2)',
    async (ch) => {
      const res = await post('/secretaria/disciplinas', { codigo: 'IF999', nome: 'Teste', ch });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDACAO');
      expect(res.body.details).toEqual([
        {
          campo: 'ch',
          mensagem: 'A carga horária deve ser múltipla de 15, entre 15h e 120h (ex.: 30, 45, 60).',
        },
      ]);
    },
  );

  it.each([15, 60, 120])('aceita CH %ih (regra 2)', async (ch) => {
    const res = await post('/secretaria/disciplinas', { codigo: `OK${ch}`, nome: 'Teste', ch });

    expect(res.status).toBe(201);
  });

  it('lista com busca por código ou nome e paginação', async () => {
    await fabrica.disciplina('IF668', 60, 'Introdução à Programação');
    await fabrica.disciplina('IF671', 60, 'Banco de Dados');
    await fabrica.disciplina('LE500', 30, 'Inglês Instrumental');

    const busca = await request(app).get('/secretaria/disciplinas?q=banco').set(auth);
    const pagina = await request(app).get('/secretaria/disciplinas?page=2&pageSize=2').set(auth);

    expect(busca.body.items.map((d: { codigo: string }) => d.codigo)).toEqual(['IF671']);
    expect(pagina.body).toMatchObject({ total: 3, page: 2, totalPages: 2 });
    expect(pagina.body.items.map((d: { codigo: string }) => d.codigo)).toEqual(['LE500']);
  });

  it('edita nome, CH e código', async () => {
    const disciplina = await fabrica.disciplina('IF668', 60, 'Intro');

    const res = await request(app)
      .put(`/secretaria/disciplinas/${disciplina.id}`)
      .set(auth)
      .send({ codigo: 'IF669', nome: 'Introdução à Programação', ch: 90 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ codigo: 'IF669', nome: 'Introdução à Programação', ch: 90 });
  });

  it('recusa editar para um código já usado por outra disciplina', async () => {
    await fabrica.disciplina('IF671');
    const disciplina = await fabrica.disciplina('IF668');

    const res = await request(app)
      .put(`/secretaria/disciplinas/${disciplina.id}`)
      .set(auth)
      .send({ codigo: 'IF671', nome: 'X', ch: 60 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CODIGO_DUPLICADO');
  });

  it('edição valida a CH e responde 404 para disciplina inexistente', async () => {
    const disciplina = await fabrica.disciplina('IF668');

    const chInvalida = await request(app)
      .put(`/secretaria/disciplinas/${disciplina.id}`)
      .set(auth)
      .send({ codigo: 'IF668', nome: 'X', ch: 125 });
    const inexistente = await request(app)
      .put('/secretaria/disciplinas/9999')
      .set(auth)
      .send({ codigo: 'IF000', nome: 'X', ch: 60 });

    expect(chInvalida.status).toBe(400);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.code).toBe('DISCIPLINA_NAO_ENCONTRADA');
  });
});

describe('professores', () => {
  it('cadastra com e-mail normalizado em minúsculas', async () => {
    const res = await post('/secretaria/professores', {
      nome: 'Maria Souza',
      email: ' Maria.Souza@Exemplo.edu.br ',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: 'Maria Souza', email: 'maria.souza@exemplo.edu.br' });
  });

  it('recusa e-mail duplicado, mesmo com maiúsculas diferentes (regra 3)', async () => {
    await fabrica.professor('maria@exemplo.edu.br');

    const res = await post('/secretaria/professores', {
      nome: 'Outra Maria',
      email: 'MARIA@exemplo.edu.br',
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_DUPLICADO');
  });

  it('recusa e-mail inválido com 400', async () => {
    const res = await post('/secretaria/professores', { nome: 'Maria', email: 'maria@' });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ campo: 'email', mensagem: 'Informe um e-mail válido' }]);
  });

  it('lista com busca por nome ou e-mail', async () => {
    await fabrica.professor('maria@exemplo.edu.br', 'Maria Souza');
    await fabrica.professor('joao@exemplo.edu.br', 'João Lima');

    const res = await request(app).get('/secretaria/professores?q=souza').set(auth);

    expect(res.body.items).toEqual([
      { id: expect.any(Number), nome: 'Maria Souza', email: 'maria@exemplo.edu.br' },
    ]);
  });
});

describe('turmas', () => {
  async function cenarioTurma(vagas = 3, matriculados = 2) {
    const curso = await fabrica.curso();
    const disciplina = await fabrica.disciplina('IF671', 60, 'Banco de Dados');
    const turma = await fabrica.turma(disciplina.id, vagas);
    for (let i = 0; i < matriculados; i++) {
      const aluno = await fabrica.aluno(`aluno${i}`, curso.id);
      await fabrica.matricula(aluno.id, turma.id);
    }
    return { disciplina, turma };
  }

  const alterarVagas = (turmaId: number, vagas: unknown) =>
    request(app).patch(`/secretaria/turmas/${turmaId}/vagas`).set(auth).send({ vagas });

  it('lista com vagas ocupadas e totais', async () => {
    const { turma } = await cenarioTurma(3, 2);

    const res = await request(app).get('/secretaria/turmas').set(auth);

    expect(res.body.items).toEqual([
      expect.objectContaining({
        id: turma.id,
        vagas: 3,
        vagasOcupadas: 2,
        vagasDisponiveis: 1,
        disciplina: expect.objectContaining({ codigo: 'IF671' }),
      }),
    ]);
  });

  it('abre turma com disciplina, professor e vagas (regra 4)', async () => {
    const disciplina = await fabrica.disciplina('IF671');
    const professor = await fabrica.professor();

    const res = await post('/secretaria/turmas', {
      disciplinaId: disciplina.id,
      professorId: professor.id,
      vagas: 40,
    });

    expect(res.status).toBe(201);
    expect(await prisma.turma.findUnique({ where: { id: res.body.id } })).toMatchObject({
      disciplinaId: disciplina.id,
      professorId: professor.id,
      vagas: 40,
    });
  });

  it('recusa turma com 0 vagas ou sem disciplina/professor (regra 4)', async () => {
    const disciplina = await fabrica.disciplina('IF671');
    const professor = await fabrica.professor();

    const zeroVagas = await post('/secretaria/turmas', {
      disciplinaId: disciplina.id,
      professorId: professor.id,
      vagas: 0,
    });
    const semProfessor = await post('/secretaria/turmas', {
      disciplinaId: disciplina.id,
      vagas: 10,
    });

    expect(zeroVagas.status).toBe(400);
    expect(zeroVagas.body.details).toEqual([{ campo: 'vagas', mensagem: expect.any(String) }]);
    expect(semProfessor.status).toBe(400);
    expect(semProfessor.body.details).toEqual([
      { campo: 'professorId', mensagem: expect.any(String) },
    ]);
  });

  it('recusa disciplina ou professor inexistente com 422', async () => {
    const disciplina = await fabrica.disciplina('IF671');
    const professor = await fabrica.professor();

    const semDisciplina = await post('/secretaria/turmas', {
      disciplinaId: 999,
      professorId: professor.id,
      vagas: 10,
    });
    const semProfessor = await post('/secretaria/turmas', {
      disciplinaId: disciplina.id,
      professorId: 999,
      vagas: 10,
    });

    expect(semDisciplina.status).toBe(422);
    expect(semDisciplina.body.code).toBe('DISCIPLINA_INEXISTENTE');
    expect(semProfessor.status).toBe(422);
    expect(semProfessor.body.code).toBe('PROFESSOR_INEXISTENTE');
  });

  describe('alteração de vagas (regra 5)', () => {
    it('recusa valor menor que o número de matriculados', async () => {
      const { turma } = await cenarioTurma(3, 2);

      const res = await alterarVagas(turma.id, 1);

      expect(res.status).toBe(422);
      expect(res.body).toMatchObject({
        code: 'VAGAS_ABAIXO_DOS_MATRICULADOS',
        details: { matriculados: 2 },
      });
      expect((await prisma.turma.findUniqueOrThrow({ where: { id: turma.id } })).vagas).toBe(3);
    });

    it('aceita valor igual ao número de matriculados (turma fica lotada)', async () => {
      const { turma } = await cenarioTurma(3, 2);

      const res = await alterarVagas(turma.id, 2);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: turma.id, vagas: 2, vagasOcupadas: 2 });
    });

    it('aceita aumentar as vagas', async () => {
      const { turma } = await cenarioTurma(3, 2);

      const res = await alterarVagas(turma.id, 50);

      expect(res.status).toBe(200);
      expect((await prisma.turma.findUniqueOrThrow({ where: { id: turma.id } })).vagas).toBe(50);
    });

    it('matrículas canceladas não contam como matriculados', async () => {
      const { turma } = await cenarioTurma(3, 2);
      await prisma.matricula.updateMany({
        where: { turmaId: turma.id },
        data: { situacao: 'CANCELADA', canceladaEm: new Date() },
      });

      const res = await alterarVagas(turma.id, 1);

      expect(res.status).toBe(200);
    });

    it('recusa 0 vagas com 400 e turma inexistente com 404', async () => {
      const { turma } = await cenarioTurma(3, 0);

      expect((await alterarVagas(turma.id, 0)).status).toBe(400);
      expect((await alterarVagas(9999, 10)).body.code).toBe('TURMA_NAO_ENCONTRADA');
    });

    /**
     * Determinístico, como o teste da matrícula: uma transação concorrente trava a turma e
     * matricula mais um aluno sem confirmar. A alteração de vagas precisa esperar e, depois,
     * contar 3 matriculados. Sem o lock, contaria 2 e aceitaria reduzir para 2 vagas.
     */
    it('espera matrícula concorrente e conta o novo matriculado', async () => {
      const { turma } = await cenarioTurma(5, 2);
      const curso = await prisma.curso.findFirstOrThrow();
      const novo = await fabrica.aluno('novo', curso.id);

      let travou!: () => void;
      const turmaTravada = new Promise<void>((resolve) => (travou = resolve));
      let liberar!: () => void;
      const liberacao = new Promise<void>((resolve) => (liberar = resolve));

      const concorrente = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM turmas WHERE id = ${turma.id} FOR UPDATE`;
          await tx.matricula.create({ data: { alunoId: novo.id, turmaId: turma.id } });
          travou();
          await liberacao;
        },
        { timeout: 10_000 },
      );
      await turmaTravada;

      const requisicao = alterarVagas(turma.id, 2).then((res) => res);
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
      } finally {
        liberar();
        await concorrente;
      }
      const res = await requisicao;

      expect(res.status).toBe(422);
      expect(res.body.details).toEqual({ matriculados: 3 });
    });
  });
});
