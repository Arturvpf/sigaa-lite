import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { authenticate, getAlunoId, requirePerfil } from '../../src/shared/auth/middlewares.js';
import { createTokenService } from '../../src/shared/auth/token-service.js';
import { BusinessRuleError } from '../../src/shared/errors/app-error.js';
import { errorHandler, notFoundHandler } from '../../src/shared/http/error-handler.js';
import { parse } from '../../src/shared/http/validate.js';

/**
 * App mínimo montado só com as peças compartilhadas (guards, validação e handler de erros),
 * para testá-las isoladamente das rotas reais.
 */
const tokens = createTokenService({
  secret: 'segredo-de-teste-com-pelo-menos-32-caracteres',
  expiresInSeconds: 3600,
});

function buildApp() {
  const app = express();
  app.use(express.json());

  app.get('/aluno/area', authenticate(tokens), requirePerfil('ALUNO'), (req, res) => {
    res.json({ alunoId: getAlunoId(req) });
  });
  app.get('/secretaria/area', authenticate(tokens), requirePerfil('SECRETARIA'), (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/validacao', (req, res) => {
    res.json(parse(z.object({ nome: z.string().min(1), ch: z.number().int() }), req.body));
  });
  app.post('/regra', () => {
    throw new BusinessRuleError('TURMA_LOTADA', 'A turma não tem vagas disponíveis.');
  });
  app.get('/inesperado', () => {
    throw new Error('detalhe interno que não deve vazar');
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const app = buildApp();
const tokenAluno = tokens.sign({ usuarioId: 2, perfil: 'ALUNO', alunoId: 5 }).token;
const tokenSecretaria = tokens.sign({ usuarioId: 1, perfil: 'SECRETARIA', alunoId: null }).token;

describe('guards de autenticação e perfil', () => {
  it('responde 401 TOKEN_AUSENTE sem cabeçalho Authorization', async () => {
    const res = await request(app).get('/aluno/area');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'TOKEN_AUSENTE', message: expect.any(String) });
  });

  it('responde 401 TOKEN_INVALIDO com token inválido', async () => {
    const res = await request(app).get('/aluno/area').auth('abc.def.ghi', { type: 'bearer' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALIDO');
  });

  it('responde 403 quando o aluno acessa rota da secretaria', async () => {
    const res = await request(app).get('/secretaria/area').auth(tokenAluno, { type: 'bearer' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACESSO_NEGADO');
  });

  it('responde 403 quando a secretaria acessa rota do aluno', async () => {
    const res = await request(app).get('/aluno/area').auth(tokenSecretaria, { type: 'bearer' });

    expect(res.status).toBe(403);
  });

  it('libera o perfil correto e identifica o aluno pelo token', async () => {
    const res = await request(app).get('/aluno/area').auth(tokenAluno, { type: 'bearer' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ alunoId: 5 });
  });
});

describe('formato padrão de erro', () => {
  it('validação responde 400 com os campos inválidos em details', async () => {
    const res = await request(app).post('/validacao').send({ nome: '', ch: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDACAO');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: 'nome' }),
        expect.objectContaining({ campo: 'ch' }),
      ]),
    );
  });

  it('JSON malformado responde 400 JSON_INVALIDO', async () => {
    const res = await request(app)
      .post('/validacao')
      .set('Content-Type', 'application/json')
      .send('{"nome": ');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('JSON_INVALIDO');
  });

  it('regra de negócio responde 422 com o código do erro', async () => {
    const res = await request(app).post('/regra');

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      code: 'TURMA_LOTADA',
      message: 'A turma não tem vagas disponíveis.',
    });
  });

  it('rota inexistente responde 404 ROTA_NAO_ENCONTRADA', async () => {
    const res = await request(app).get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROTA_NAO_ENCONTRADA');
  });

  it('erro inesperado responde 500 sem vazar detalhes internos', async () => {
    const res = await request(app).get('/inesperado');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: 'ERRO_INTERNO', message: 'Erro interno do servidor.' });
  });
});
