import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sessaoStorage } from '../auth/session';
import { api, definirAoExpirarSessao } from './client';
import { ApiError } from './errors';

const fetchMock = vi.fn<typeof fetch>();

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function logar() {
  sessaoStorage.salvar({
    token: 'token-123',
    usuario: { id: 1, username: 'ana', perfil: 'ALUNO', aluno: null },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  definirAoExpirarSessao(() => {});
});

describe('cliente HTTP', () => {
  it('envia o token da sessão no cabeçalho Authorization', async () => {
    logar();
    fetchMock.mockResolvedValue(resposta(200, { ok: true }));

    await api('/aluno/progresso');

    const [, init] = fetchMock.mock.calls[0]!;
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('monta a query string ignorando valores vazios', async () => {
    fetchMock.mockResolvedValue(resposta(200, {}));

    await api('/aluno/ofertas', { query: { q: '', page: 2, pageSize: undefined } });

    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:3333/aluno/ofertas?page=2');
  });

  it('envia o corpo como JSON', async () => {
    fetchMock.mockResolvedValue(resposta(201, { id: 1 }));

    const resultado = await api('/aluno/matriculas', { method: 'POST', body: { turmaId: 7 } });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.body).toBe('{"turmaId":7}');
    expect(resultado).toEqual({ id: 1 });
  });

  it('converte o erro padrão da API em ApiError com code e message', async () => {
    fetchMock.mockResolvedValue(
      resposta(422, { code: 'TURMA_LOTADA', message: 'Esta turma não tem mais vagas.' }),
    );

    const erro = await api('/aluno/matriculas', { method: 'POST', body: {} }).catch((e) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({
      status: 422,
      code: 'TURMA_LOTADA',
      message: 'Esta turma não tem mais vagas.',
      isBusinessRule: true,
    });
  });

  it('converte falha de rede em ApiError de rede', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const erro = await api('/aluno/ofertas').catch((e) => e);

    expect(erro).toMatchObject({ status: 0, code: 'FALHA_DE_REDE', isNetworkError: true });
  });

  it('trata resposta de erro fora do formato padrão', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));

    const erro = await api('/aluno/ofertas').catch((e) => e);

    expect(erro).toMatchObject({ status: 502, code: 'ERRO_INESPERADO' });
  });

  it('devolve undefined em 204 sem conteúdo', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api('/aluno/matriculas/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  describe('sessão expirada (401)', () => {
    it('avisa que a sessão expirou quando havia sessão ativa', async () => {
      logar();
      const aoExpirar = vi.fn();
      definirAoExpirarSessao(aoExpirar);
      fetchMock.mockResolvedValue(
        resposta(401, { code: 'TOKEN_EXPIRADO', message: 'Sua sessão expirou.' }),
      );

      await expect(api('/aluno/ofertas')).rejects.toMatchObject({ code: 'TOKEN_EXPIRADO' });
      expect(aoExpirar).toHaveBeenCalledOnce();
    });

    it('não trata como expiração o 401 de credenciais inválidas no login (sem sessão)', async () => {
      const aoExpirar = vi.fn();
      definirAoExpirarSessao(aoExpirar);
      fetchMock.mockResolvedValue(
        resposta(401, { code: 'CREDENCIAIS_INVALIDAS', message: 'Usuário ou senha inválidos.' }),
      );

      await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
        code: 'CREDENCIAIS_INVALIDAS',
      });
      expect(aoExpirar).not.toHaveBeenCalled();
    });
  });
});
