import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { setupIntegration, tokenDe } from './test-context.js';

const { app, prisma, fabrica } = setupIntegration();

/**
 * Cenário base: dois cursos que classificam as mesmas disciplinas de forma diferente.
 * - BD: obrigatória em CC, eletiva de perfil em EC
 * - CG: eletiva de perfil em CC, fora de EC (livre)
 * - LIB: fora dos dois (livre)
 */
async function cenario() {
  const cc = await fabrica.curso('Ciência da Computação');
  const ec = await fabrica.curso('Engenharia da Computação');
  const bd = await fabrica.disciplina('IF671', 60, 'Banco de Dados');
  const cg = await fabrica.disciplina('IF677', 60, 'Computação Gráfica');
  const lib = await fabrica.disciplina('LE001', 30, 'Libras');
  await fabrica.naEstrutura(cc.id, bd.id, 'OBRIGATORIA');
  await fabrica.naEstrutura(cc.id, cg.id, 'ELETIVA_PERFIL');
  await fabrica.naEstrutura(ec.id, bd.id, 'ELETIVA_PERFIL');

  const turmaBd = await fabrica.turma(bd.id, 30);
  const turmaCg = await fabrica.turma(cg.id, 30);
  const turmaLib = await fabrica.turma(lib.id, 30);

  const ana = await fabrica.aluno('ana', cc.id);
  const carla = await fabrica.aluno('carla', ec.id);

  return { cc, ec, bd, cg, lib, turmaBd, turmaCg, turmaLib, ana, carla };
}

const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('acesso às rotas do aluno', () => {
  it('responde 401 sem token', async () => {
    const res = await request(app).get('/aluno/ofertas');

    expect(res.status).toBe(401);
  });

  it('responde 403 para a secretaria', async () => {
    await fabrica.secretaria();
    const token = await tokenDe(app, 'secretaria');

    const res = await request(app).get('/aluno/ofertas').set(comToken(token));

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACESSO_NEGADO');
  });
});

describe('GET /aluno/ofertas', () => {
  it('mostra a classificação conforme o curso de quem está logado (regra 10)', async () => {
    await cenario();
    const tokenAna = await tokenDe(app, 'ana');
    const tokenCarla = await tokenDe(app, 'carla');

    const ofertasAna = await request(app).get('/aluno/ofertas').set(comToken(tokenAna));
    const ofertasCarla = await request(app).get('/aluno/ofertas').set(comToken(tokenCarla));

    const classificacoes = (body: {
      items: { disciplina: { codigo: string }; classificacao: string }[];
    }) => Object.fromEntries(body.items.map((o) => [o.disciplina.codigo, o.classificacao]));

    expect(classificacoes(ofertasAna.body)).toEqual({
      IF671: 'OBRIGATORIA',
      IF677: 'ELETIVA_PERFIL',
      LE001: 'ELETIVA_LIVRE',
    });
    expect(classificacoes(ofertasCarla.body)).toEqual({
      IF671: 'ELETIVA_PERFIL',
      IF677: 'ELETIVA_LIVRE',
      LE001: 'ELETIVA_LIVRE',
    });
  });

  it('mostra vagas totais, ocupadas e disponíveis de cada turma', async () => {
    const { lib, carla } = await cenario();
    const turma = await fabrica.turma(lib.id, 2);
    await fabrica.matricula(carla.id, turma.id);
    const token = await tokenDe(app, 'ana');

    const res = await request(app).get('/aluno/ofertas').set(comToken(token));
    const oferta = res.body.items.find((o: { id: number }) => o.id === turma.id);

    expect(oferta).toMatchObject({
      vagas: 2,
      vagasOcupadas: 1,
      vagasDisponiveis: 1,
      lotada: false,
      matriculaId: null,
    });
  });

  it('indica matrícula do próprio aluno e disciplina já aprovada', async () => {
    const { turmaBd, turmaCg, cg, ana } = await cenario();
    const matricula = await fabrica.matricula(ana.id, turmaBd.id);
    await fabrica.historico(ana.id, cg.id, 'APROVADO');
    const token = await tokenDe(app, 'ana');

    const res = await request(app).get('/aluno/ofertas').set(comToken(token));
    const porTurma = new Map(res.body.items.map((o: { id: number }) => [o.id, o]));

    expect(porTurma.get(turmaBd.id)).toMatchObject({
      matriculaId: matricula.id,
      jaAprovado: false,
    });
    expect(porTurma.get(turmaCg.id)).toMatchObject({ matriculaId: null, jaAprovado: true });
  });

  it('busca por código ou nome da disciplina, sem diferenciar maiúsculas', async () => {
    await cenario();
    const token = await tokenDe(app, 'ana');

    const porCodigo = await request(app).get('/aluno/ofertas?q=if67').set(comToken(token));
    const porNome = await request(app).get('/aluno/ofertas?q=libr').set(comToken(token));
    const semResultado = await request(app).get('/aluno/ofertas?q=xyz').set(comToken(token));

    expect(porCodigo.body.total).toBe(2);
    expect(
      porNome.body.items.map((o: { disciplina: { codigo: string } }) => o.disciplina.codigo),
    ).toEqual(['LE001']);
    expect(semResultado.body).toMatchObject({ items: [], total: 0 });
  });

  it('pagina o resultado', async () => {
    await cenario();
    const token = await tokenDe(app, 'ana');

    const res = await request(app).get('/aluno/ofertas?page=2&pageSize=2').set(comToken(token));

    expect(res.body).toMatchObject({ total: 3, page: 2, pageSize: 2, totalPages: 2 });
    expect(res.body.items).toHaveLength(1);
  });

  it('responde 400 para paginação inválida', async () => {
    await cenario();
    const token = await tokenDe(app, 'ana');

    const res = await request(app).get('/aluno/ofertas?pageSize=1000').set(comToken(token));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDACAO');
  });
});

describe('POST /aluno/matriculas', () => {
  let ctx: Awaited<ReturnType<typeof cenario>>;
  let token: string;

  beforeEach(async () => {
    ctx = await cenario();
    token = await tokenDe(app, 'ana');
  });

  const matricular = (turmaId: unknown, t = token) =>
    request(app).post('/aluno/matriculas').set(comToken(t)).send({ turmaId });

  it('matricula o aluno logado e ocupa uma vaga', async () => {
    const res = await matricular(ctx.turmaBd.id);

    expect(res.status).toBe(201);
    const matricula = await prisma.matricula.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(matricula).toMatchObject({
      alunoId: ctx.ana.id,
      turmaId: ctx.turmaBd.id,
      situacao: 'ATIVA',
    });
  });

  it('ignora um alunoId enviado no corpo e usa o do token (regra 9)', async () => {
    const res = await request(app)
      .post('/aluno/matriculas')
      .set(comToken(token))
      .send({ turmaId: ctx.turmaBd.id, alunoId: ctx.carla.id });

    expect(res.status).toBe(201);
    const matricula = await prisma.matricula.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(matricula.alunoId).toBe(ctx.ana.id);
  });

  it('recusa turma lotada com 422 TURMA_LOTADA (regra 6)', async () => {
    const turma = await fabrica.turma(ctx.lib.id, 1);
    await fabrica.matricula(ctx.carla.id, turma.id);

    const res = await matricular(turma.id);

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      code: 'TURMA_LOTADA',
      message: 'Esta turma não tem mais vagas disponíveis.',
    });
  });

  it('recusa disciplina já aprovada com 422 DISCIPLINA_JA_APROVADA (regra 7)', async () => {
    await fabrica.historico(ctx.ana.id, ctx.bd.id, 'APROVADO');

    const res = await matricular(ctx.turmaBd.id);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('DISCIPLINA_JA_APROVADA');
  });

  it('permite cursar de novo disciplina em que foi reprovado (regra 7)', async () => {
    await fabrica.historico(ctx.ana.id, ctx.bd.id, 'REPROVADO');

    const res = await matricular(ctx.turmaBd.id);

    expect(res.status).toBe(201);
  });

  it('recusa matrícula duplicada na mesma turma com 409', async () => {
    await matricular(ctx.turmaBd.id);

    const res = await matricular(ctx.turmaBd.id);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('JA_MATRICULADO_NA_TURMA');
  });

  it('recusa matrícula em outra turma da mesma disciplina', async () => {
    const outraTurma = await fabrica.turma(ctx.bd.id, 30);
    await matricular(ctx.turmaBd.id);

    const res = await matricular(outraTurma.id);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('JA_MATRICULADO_NA_DISCIPLINA');
  });

  it('responde 404 para turma inexistente', async () => {
    const res = await matricular(9999);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TURMA_NAO_ENCONTRADA');
  });

  it('responde 400 quando turmaId não é informado ou é inválido', async () => {
    const semTurma = await matricular(undefined);
    const textoInvalido = await matricular('abc');

    expect(semTurma.status).toBe(400);
    expect(textoInvalido.status).toBe(400);
    expect(textoInvalido.body.details).toEqual([
      { campo: 'turmaId', mensagem: expect.any(String) },
    ]);
  });

  it('com várias matrículas simultâneas na última vaga, só uma é aceita', async () => {
    const turma = await fabrica.turma(ctx.lib.id, 1);
    const tokens = [];
    for (let i = 0; i < 6; i++) {
      await fabrica.aluno(`concorrente${i}`, ctx.cc.id);
      tokens.push(await tokenDe(app, `concorrente${i}`));
    }

    const respostas = await Promise.all(tokens.map((t) => matricular(turma.id, t)));
    const status = respostas.map((r) => r.status).sort();

    expect(status).toEqual([201, 422, 422, 422, 422, 422]);
    expect(await prisma.matricula.count({ where: { turmaId: turma.id, situacao: 'ATIVA' } })).toBe(
      1,
    );
  });
});

describe('concorrência na última vaga', () => {
  /**
   * Teste determinístico do lock: uma transação concorrente trava a turma e ocupa a última vaga
   * sem confirmar. A matrícula pela API precisa ESPERAR essa transação e, depois, ver a turma
   * lotada. Sem o SELECT ... FOR UPDATE, a API contaria 0 ocupadas (a inserção concorrente
   * ainda não foi confirmada) e aceitaria a matrícula: este teste falharia.
   */
  it('a matrícula espera quem travou a turma antes e então vê a vaga ocupada', async () => {
    const { lib, carla } = await cenario();
    const turma = await fabrica.turma(lib.id, 1);
    const token = await tokenDe(app, 'ana');

    let turmaTravada!: () => void;
    const travou = new Promise<void>((resolve) => (turmaTravada = resolve));
    let liberar!: () => void;
    const liberacao = new Promise<void>((resolve) => (liberar = resolve));

    const transacaoConcorrente = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM turmas WHERE id = ${turma.id} FOR UPDATE`;
        await tx.matricula.create({ data: { alunoId: carla.id, turmaId: turma.id } });
        turmaTravada();
        await liberacao; // mantém a transação (e o lock) aberta
      },
      { timeout: 10_000 },
    );
    await travou;

    let respondeu = false;
    const requisicao = request(app)
      .post('/aluno/matriculas')
      .set(comToken(token))
      .send({ turmaId: turma.id })
      .then((res) => {
        respondeu = true;
        return res;
      });

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(respondeu).toBe(false); // bloqueada pelo lock da transação concorrente
    } finally {
      // Sempre libera, mesmo se a verificação acima falhar, para não deixar a transação aberta
      liberar();
      await transacaoConcorrente;
    }
    const res = await requisicao;

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('TURMA_LOTADA');
    expect(await prisma.matricula.count({ where: { turmaId: turma.id } })).toBe(1);
  });
});

describe('GET /aluno/matriculas', () => {
  it('lista só as matrículas ativas do próprio aluno, com classificação (regra 9)', async () => {
    const { turmaBd, turmaCg, turmaLib, ana, carla } = await cenario();
    await fabrica.matricula(ana.id, turmaBd.id);
    const cancelada = await fabrica.matricula(ana.id, turmaCg.id);
    await prisma.matricula.update({
      where: { id: cancelada.id },
      data: { situacao: 'CANCELADA', canceladaEm: new Date() },
    });
    await fabrica.matricula(carla.id, turmaLib.id);
    const token = await tokenDe(app, 'ana');

    const res = await request(app).get('/aluno/matriculas').set(comToken(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      turma: { id: turmaBd.id, disciplina: { codigo: 'IF671' } },
      classificacao: 'OBRIGATORIA',
    });
  });

  it('devolve lista vazia quando o aluno não tem matrículas', async () => {
    await cenario();
    const token = await tokenDe(app, 'ana');

    const res = await request(app).get('/aluno/matriculas').set(comToken(token));

    expect(res.body).toEqual([]);
  });
});

describe('DELETE /aluno/matriculas/:id', () => {
  it('cancela a matrícula e a vaga volta para a turma (regra 8)', async () => {
    const { lib, ana } = await cenario();
    const turma = await fabrica.turma(lib.id, 1);
    const matricula = await fabrica.matricula(ana.id, turma.id);
    const tokenAna = await tokenDe(app, 'ana');
    const tokenCarla = await tokenDe(app, 'carla');

    const cancelamento = await request(app)
      .delete(`/aluno/matriculas/${matricula.id}`)
      .set(comToken(tokenAna));
    const matriculaCarla = await request(app)
      .post('/aluno/matriculas')
      .set(comToken(tokenCarla))
      .send({ turmaId: turma.id });

    expect(cancelamento.status).toBe(204);
    expect(await prisma.matricula.findUnique({ where: { id: matricula.id } })).toMatchObject({
      situacao: 'CANCELADA',
      canceladaEm: expect.any(Date),
    });
    expect(matriculaCarla.status).toBe(201);
  });

  it('recusa cancelar matrícula já cancelada', async () => {
    const { turmaBd, ana } = await cenario();
    const matricula = await fabrica.matricula(ana.id, turmaBd.id);
    const token = await tokenDe(app, 'ana');
    await request(app).delete(`/aluno/matriculas/${matricula.id}`).set(comToken(token));

    const res = await request(app).delete(`/aluno/matriculas/${matricula.id}`).set(comToken(token));

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('MATRICULA_JA_CANCELADA');
  });

  it('responde 404 ao tentar cancelar matrícula de outro aluno, sem alterá-la (regra 9)', async () => {
    const { turmaBd, carla } = await cenario();
    const matriculaCarla = await fabrica.matricula(carla.id, turmaBd.id);
    const tokenAna = await tokenDe(app, 'ana');

    const res = await request(app)
      .delete(`/aluno/matriculas/${matriculaCarla.id}`)
      .set(comToken(tokenAna));

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('MATRICULA_NAO_ENCONTRADA');
    expect(
      (await prisma.matricula.findUniqueOrThrow({ where: { id: matriculaCarla.id } })).situacao,
    ).toBe('ATIVA');
  });

  it('a matrícula cancelada some da lista e permite matricular de novo', async () => {
    const { turmaBd, ana } = await cenario();
    const matricula = await fabrica.matricula(ana.id, turmaBd.id);
    const token = await tokenDe(app, 'ana');
    await request(app).delete(`/aluno/matriculas/${matricula.id}`).set(comToken(token));

    const lista = await request(app).get('/aluno/matriculas').set(comToken(token));
    const novaMatricula = await request(app)
      .post('/aluno/matriculas')
      .set(comToken(token))
      .send({ turmaId: turmaBd.id });

    expect(lista.body).toEqual([]);
    expect(novaMatricula.status).toBe(201);
  });
});

describe('GET /aluno/progresso', () => {
  it('calcula cada grupo pelo curso do aluno, separando integralizada de em curso', async () => {
    const { bd, cg, turmaLib, ana } = await cenario();
    await fabrica.historico(ana.id, bd.id, 'APROVADO'); // obrigatória em CC: 60h
    await fabrica.historico(ana.id, cg.id, 'REPROVADO'); // reprovação não soma
    await fabrica.matricula(ana.id, turmaLib.id); // livre em curso: 30h
    const token = await tokenDe(app, 'ana');

    const res = await request(app).get('/aluno/progresso').set(comToken(token));

    expect(res.status).toBe(200);
    expect(res.body.curso.nome).toBe('Ciência da Computação');
    expect(res.body.grupos).toEqual([
      {
        grupo: 'OBRIGATORIA',
        chExigida: 360,
        chIntegralizada: 60,
        chEmCurso: 0,
        chFaltante: 300,
        percentual: 16,
      },
      {
        grupo: 'ELETIVA_PERFIL',
        chExigida: 120,
        chIntegralizada: 0,
        chEmCurso: 0,
        chFaltante: 120,
        percentual: 0,
      },
      {
        grupo: 'ELETIVA_LIVRE',
        chExigida: 60,
        chIntegralizada: 0,
        chEmCurso: 30,
        chFaltante: 60,
        percentual: 0,
      },
    ]);
  });

  it('a mesma aprovação conta em grupos diferentes para alunos de cursos diferentes', async () => {
    const { bd, ana, carla } = await cenario();
    await fabrica.historico(ana.id, bd.id, 'APROVADO');
    await fabrica.historico(carla.id, bd.id, 'APROVADO');

    const progressoDe = async (username: string) => {
      const res = await request(app)
        .get('/aluno/progresso')
        .set(comToken(await tokenDe(app, username)));
      return Object.fromEntries(
        res.body.grupos.map((g: { grupo: string; chIntegralizada: number }) => [
          g.grupo,
          g.chIntegralizada,
        ]),
      );
    };

    expect(await progressoDe('ana')).toMatchObject({ OBRIGATORIA: 60, ELETIVA_PERFIL: 0 });
    expect(await progressoDe('carla')).toMatchObject({ OBRIGATORIA: 0, ELETIVA_PERFIL: 60 });
  });
});
