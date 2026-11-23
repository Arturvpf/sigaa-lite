import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { setupIntegration, tokenDe } from './test-context.js';

/** Requisito à escolha: pré-requisitos entre disciplinas, pela API. */
const { app, prisma, fabrica } = setupIntegration();

let ids: { intro: number; aed: number; bd: number; discreta: number; compiladores: number };
let alunoId: number;
let authAluno: { Authorization: string };
let authSecretaria: { Authorization: string };

beforeEach(async () => {
  const curso = await fabrica.curso();
  const intro = await fabrica.disciplina('IF668', 60, 'Introdução à Programação');
  const aed = await fabrica.disciplina('IF669', 60, 'Algoritmos');
  const bd = await fabrica.disciplina('IF671', 60, 'Banco de Dados');
  const discreta = await fabrica.disciplina('IF670', 60, 'Matemática Discreta');
  const compiladores = await fabrica.disciplina('IF678', 60, 'Compiladores');
  ids = {
    intro: intro.id,
    aed: aed.id,
    bd: bd.id,
    discreta: discreta.id,
    compiladores: compiladores.id,
  };

  alunoId = (await fabrica.aluno('ana', curso.id)).id;
  await fabrica.secretaria();
  authAluno = { Authorization: `Bearer ${await tokenDe(app, 'ana')}` };
  authSecretaria = { Authorization: `Bearer ${await tokenDe(app, 'secretaria')}` };
});

const matricular = (turmaId: number) =>
  request(app).post('/aluno/matriculas').set(authAluno).send({ turmaId });

const definir = (disciplinaId: number, preRequisitoIds: unknown) =>
  request(app)
    .put(`/secretaria/disciplinas/${disciplinaId}/pre-requisitos`)
    .set(authSecretaria)
    .send({ preRequisitoIds });

describe('matrícula com pré-requisitos', () => {
  it('recusa com 422 e lista o que falta quando o pré-requisito não foi aprovado', async () => {
    await fabrica.preRequisito(ids.bd, ids.aed);
    const turma = await fabrica.turma(ids.bd);

    const res = await matricular(turma.id);

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      code: 'PRE_REQUISITO_PENDENTE',
      message: 'Você precisa ser aprovado antes em: IF669.',
      details: { pendentes: [{ id: ids.aed, codigo: 'IF669', nome: 'Algoritmos' }] },
    });
  });

  it('aceita quando todos os pré-requisitos estão aprovados', async () => {
    await fabrica.preRequisito(ids.compiladores, ids.aed);
    await fabrica.preRequisito(ids.compiladores, ids.discreta);
    await fabrica.historico(alunoId, ids.aed, 'APROVADO');
    await fabrica.historico(alunoId, ids.discreta, 'APROVADO');
    const turma = await fabrica.turma(ids.compiladores);

    expect((await matricular(turma.id)).status).toBe(201);
  });

  it('reprovação e matrícula em curso no pré-requisito não atendem', async () => {
    await fabrica.preRequisito(ids.bd, ids.aed);
    await fabrica.historico(alunoId, ids.aed, 'REPROVADO');
    const turmaAed = await fabrica.turma(ids.aed);
    const turmaBd = await fabrica.turma(ids.bd);
    expect((await matricular(turmaAed.id)).status).toBe(201); // cursando AED agora

    const res = await matricular(turmaBd.id);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PRE_REQUISITO_PENDENTE');
  });

  it('as ofertas mostram os pré-requisitos e se estão atendidos', async () => {
    await fabrica.preRequisito(ids.compiladores, ids.aed);
    await fabrica.preRequisito(ids.compiladores, ids.discreta);
    await fabrica.historico(alunoId, ids.discreta, 'APROVADO');
    await fabrica.turma(ids.compiladores);

    const res = await request(app).get('/aluno/ofertas').set(authAluno);

    expect(res.body.items[0].preRequisitos).toEqual([
      { id: ids.aed, codigo: 'IF669', nome: 'Algoritmos', atendido: false },
      { id: ids.discreta, codigo: 'IF670', nome: 'Matemática Discreta', atendido: true },
    ]);
  });
});

describe('secretaria define pré-requisitos', () => {
  it('define e devolve a disciplina com os pré-requisitos, também na listagem', async () => {
    const res = await definir(ids.compiladores, [ids.aed, ids.discreta, ids.aed]);
    const lista = await request(app).get('/secretaria/disciplinas?q=IF678').set(authSecretaria);

    expect(res.status).toBe(200);
    expect(res.body.preRequisitos.map((p: { codigo: string }) => p.codigo)).toEqual([
      'IF669',
      'IF670',
    ]);
    expect(lista.body.items[0].preRequisitos).toHaveLength(2);
  });

  it('substitui a lista inteira, e lista vazia remove todos', async () => {
    await definir(ids.compiladores, [ids.aed, ids.discreta]);

    const troca = await definir(ids.compiladores, [ids.intro]);
    const vazia = await definir(ids.compiladores, []);

    expect(troca.body.preRequisitos.map((p: { codigo: string }) => p.codigo)).toEqual(['IF668']);
    expect(vazia.body.preRequisitos).toEqual([]);
    expect(await prisma.preRequisito.count()).toBe(0);
  });

  it('recusa a própria disciplina como pré-requisito', async () => {
    const res = await definir(ids.bd, [ids.bd]);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PRE_REQUISITO_INVALIDO');
  });

  it('recusa disciplina inexistente e responde 404 para disciplina alvo inexistente', async () => {
    const inexistente = await definir(ids.bd, [9999]);
    const alvo = await definir(9999, [ids.aed]);

    expect(inexistente.status).toBe(422);
    expect(inexistente.body.code).toBe('PRE_REQUISITO_INEXISTENTE');
    expect(alvo.status).toBe(404);
  });

  it('recusa ciclo direto e indireto sem alterar nada', async () => {
    // IF671 exige IF669, que exige IF668
    await definir(ids.bd, [ids.aed]);
    await definir(ids.aed, [ids.intro]);

    const direto = await definir(ids.aed, [ids.bd]); // IF669 exigiria IF671 (que exige IF669)
    const indireto = await definir(ids.intro, [ids.bd]); // IF668 → IF671 → IF669 → IF668

    expect(direto.status).toBe(422);
    expect(direto.body.code).toBe('PRE_REQUISITO_CICLICO');
    expect(indireto.body.code).toBe('PRE_REQUISITO_CICLICO');
    expect(await prisma.preRequisito.count()).toBe(2);
  });

  it('valida o corpo e é exclusiva da secretaria', async () => {
    const semLista = await definir(ids.bd, undefined);
    const doAluno = await request(app)
      .put(`/secretaria/disciplinas/${ids.bd}/pre-requisitos`)
      .set(authAluno)
      .send({ preRequisitoIds: [] });

    expect(semLista.status).toBe(400);
    expect(doAluno.status).toBe(403);
  });

  it('o novo pré-requisito passa a valer para as próximas matrículas', async () => {
    const turma = await fabrica.turma(ids.bd);
    await definir(ids.bd, [ids.aed]);

    expect((await matricular(turma.id)).body.code).toBe('PRE_REQUISITO_PENDENTE');
  });
});
