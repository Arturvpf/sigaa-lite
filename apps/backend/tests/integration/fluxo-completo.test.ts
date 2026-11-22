import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupIntegration } from './test-context.js';

const { app, fabrica } = setupIntegration();

/**
 * Jornada completa do aluno, só pela API e na ordem em que o front-end faz as chamadas:
 * login → ofertas → matrícula → progresso → minhas matrículas → cancelamento.
 */
describe('fluxo completo do aluno', () => {
  it('login → ofertas → matrícula → progresso → cancelamento', async () => {
    const curso = await fabrica.curso('Ciência da Computação');
    const bd = await fabrica.disciplina('IF671', 60, 'Banco de Dados');
    await fabrica.naEstrutura(curso.id, bd.id, 'OBRIGATORIA');
    const turma = await fabrica.turma(bd.id, 1);
    await fabrica.aluno('ana', curso.id);

    // 1. Login
    const login = await request(app).post('/auth/login').send({ username: 'ana' });
    expect(login.status).toBe(200);
    const auth = { Authorization: `Bearer ${login.body.token}` };

    // 2. Ofertas: a turma aparece com vaga e como obrigatória
    const ofertas = await request(app).get('/aluno/ofertas?q=banco').set(auth);
    expect(ofertas.body.items).toEqual([
      expect.objectContaining({
        id: turma.id,
        vagasDisponiveis: 1,
        classificacao: 'OBRIGATORIA',
        matriculaId: null,
      }),
    ]);

    // 3. Matrícula na última vaga
    const matricula = await request(app)
      .post('/aluno/matriculas')
      .set(auth)
      .send({ turmaId: turma.id });
    expect(matricula.status).toBe(201);

    // 4. A oferta passa a mostrar a turma lotada e a matrícula do aluno
    const depois = await request(app).get('/aluno/ofertas?q=banco').set(auth);
    expect(depois.body.items[0]).toMatchObject({
      vagasDisponiveis: 0,
      lotada: true,
      matriculaId: matricula.body.id,
    });

    // 5. Progresso: 60h obrigatórias em curso, nada integralizado ainda
    const progresso = await request(app).get('/aluno/progresso').set(auth);
    expect(progresso.body.grupos[0]).toMatchObject({
      grupo: 'OBRIGATORIA',
      chIntegralizada: 0,
      chEmCurso: 60,
      chFaltante: 360,
    });

    // 6. Minhas matrículas
    const minhas = await request(app).get('/aluno/matriculas').set(auth);
    expect(minhas.body.map((m: { id: number }) => m.id)).toEqual([matricula.body.id]);

    // 7. Cancelamento: a vaga volta e o progresso deixa de contar a CH em curso
    const cancelamento = await request(app)
      .delete(`/aluno/matriculas/${matricula.body.id}`)
      .set(auth);
    expect(cancelamento.status).toBe(204);

    const ofertasFinal = await request(app).get('/aluno/ofertas?q=banco').set(auth);
    const progressoFinal = await request(app).get('/aluno/progresso').set(auth);
    expect(ofertasFinal.body.items[0]).toMatchObject({ vagasDisponiveis: 1, matriculaId: null });
    expect(progressoFinal.body.grupos[0].chEmCurso).toBe(0);
  });

  it('erros de validação e de regra de negócio voltam no formato padrão', async () => {
    const curso = await fabrica.curso();
    await fabrica.aluno('ana', curso.id);
    const login = await request(app).post('/auth/login').send({ username: 'ana' });
    const auth = { Authorization: `Bearer ${login.body.token}` };
    const formatoPadrao = {
      code: expect.any(String),
      message: expect.any(String),
    };

    const validacao = await request(app).post('/aluno/matriculas').set(auth).send({});
    const naoEncontrada = await request(app)
      .post('/aluno/matriculas')
      .set(auth)
      .send({ turmaId: 123 });
    const semToken = await request(app).get('/aluno/progresso');

    expect(validacao.status).toBe(400);
    expect(validacao.body).toEqual({ ...formatoPadrao, details: expect.any(Array) });
    expect(naoEncontrada.status).toBe(404);
    expect(naoEncontrada.body).toEqual(formatoPadrao);
    expect(semToken.status).toBe(401);
    expect(semToken.body).toEqual(formatoPadrao);
  });
});
