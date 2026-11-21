import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupIntegration } from './test-context.js';
import { testEnv } from './test-env.js';

const { app, prisma, fabrica } = setupIntegration();

async function login(body: object) {
  return request(app).post('/auth/login').send(body);
}

describe('POST /auth/login', () => {
  it('autentica o aluno pelo nome de usuário e devolve token e dados do curso', async () => {
    const curso = await fabrica.curso('Ciência da Computação');
    const aluno = await fabrica.aluno('ana', curso.id, 'Ana Beatriz');

    const res = await login({ username: 'ana' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      token: expect.any(String),
      expiresIn: 3600,
      usuario: {
        id: aluno.usuarioId,
        username: 'ana',
        perfil: 'ALUNO',
        aluno: { id: aluno.id, nome: 'Ana Beatriz', curso: { id: curso.id, nome: curso.nome } },
      },
    });
  });

  it('o token do aluno carrega o perfil e o id do aluno', async () => {
    const curso = await fabrica.curso();
    const aluno = await fabrica.aluno('ana', curso.id);

    const res = await login({ username: 'ana' });
    const payload = jwt.verify(res.body.token, testEnv.JWT_SECRET) as jwt.JwtPayload;

    expect(payload).toMatchObject({
      sub: String(aluno.usuarioId),
      perfil: 'ALUNO',
      alunoId: aluno.id,
    });
  });

  it('autentica a secretaria, que não tem aluno vinculado', async () => {
    await fabrica.secretaria();

    const res = await login({ username: 'secretaria' });

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ perfil: 'SECRETARIA', aluno: null });
  });

  it('ignora maiúsculas e espaços no nome de usuário', async () => {
    await fabrica.secretaria();

    const res = await login({ username: '  Secretaria ' });

    expect(res.status).toBe(200);
  });

  it('responde 401 CREDENCIAIS_INVALIDAS para usuário inexistente', async () => {
    const res = await login({ username: 'fantasma' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: 'CREDENCIAIS_INVALIDAS',
      message: 'Usuário ou senha inválidos.',
    });
  });

  it('responde 400 VALIDACAO quando o nome de usuário não é informado', async () => {
    const res = await login({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDACAO');
    expect(res.body.details).toEqual([{ campo: 'username', mensagem: expect.any(String) }]);
  });

  describe('usuário com senha cadastrada', () => {
    it('exige a senha correta', async () => {
      await fabrica.secretaria('admin', 'senha-forte');

      const semSenha = await login({ username: 'admin' });
      const senhaErrada = await login({ username: 'admin', senha: 'outra' });
      const senhaCerta = await login({ username: 'admin', senha: 'senha-forte' });

      expect(semSenha.status).toBe(401);
      expect(senhaErrada.status).toBe(401);
      expect(senhaErrada.body.code).toBe('CREDENCIAIS_INVALIDAS');
      expect(senhaCerta.status).toBe(200);
    });
  });
});

describe('GET /auth/me', () => {
  it('devolve o usuário do token', async () => {
    const curso = await fabrica.curso();
    await fabrica.aluno('ana', curso.id);
    const { body } = await login({ username: 'ana' });

    const res = await request(app).get('/auth/me').auth(body.token, { type: 'bearer' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(body.usuario);
  });

  it('responde 401 TOKEN_AUSENTE sem token', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_AUSENTE');
  });

  it('responde 401 TOKEN_EXPIRADO com token vencido', async () => {
    const usuario = await fabrica.secretaria();
    const expirado = jwt.sign(
      { perfil: 'SECRETARIA', alunoId: null, exp: Math.floor(Date.now() / 1000) - 1 },
      testEnv.JWT_SECRET,
      { subject: String(usuario.id) },
    );

    const res = await request(app).get('/auth/me').auth(expirado, { type: 'bearer' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRADO');
  });

  it('responde 401 quando o usuário do token não existe mais', async () => {
    const usuario = await fabrica.secretaria();
    const { body } = await login({ username: 'secretaria' });
    await prisma.usuario.delete({ where: { id: usuario.id } });

    const res = await request(app).get('/auth/me').auth(body.token, { type: 'bearer' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALIDO');
  });
});
