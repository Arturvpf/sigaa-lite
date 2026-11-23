import { beforeEach, describe, expect, it } from 'vitest';
import { createAlunoService } from '../../src/modules/aluno/aluno.service.js';
import { AppError } from '../../src/shared/errors/app-error.js';
import { createAlunoRepositoryFake } from './fakes/aluno-repository.fake.js';

/**
 * Regras 6 a 9 testadas no service, com repositório em memória.
 * Complementa os testes de integração: aqui cada regra é isolada e o teste falha
 * se a verificação correspondente for removida do service.
 */
async function codigoDoErro(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (error) {
    if (error instanceof AppError) return { status: error.status, code: error.code };
    throw error;
  }
  throw new Error('era esperado um erro de negócio');
}

describe('AlunoService', () => {
  let fake: ReturnType<typeof createAlunoRepositoryFake>;
  let service: ReturnType<typeof createAlunoService>;
  const ANA = 1;
  const CARLA = 2;
  const DISCIPLINA = 10;

  function turma(vagas: number, disciplinaId = DISCIPLINA) {
    const id = fake.novoId();
    fake.dados.turmas.push({ id, disciplinaId, vagas });
    return id;
  }

  function matricular(alunoId: number, turmaId: number) {
    return service.matricular(alunoId, turmaId);
  }

  beforeEach(() => {
    fake = createAlunoRepositoryFake();
    service = createAlunoService({ repo: fake.repo });
    fake.dados.cursos.push({
      id: 1,
      nome: 'CC',
      chObrigatoria: 360,
      chEletivaPerfil: 120,
      chEletivaLivre: 60,
      estrutura: [{ disciplinaId: DISCIPLINA, tipo: 'OBRIGATORIA' }],
    });
    fake.dados.alunos.push({ id: ANA, cursoId: 1 }, { id: CARLA, cursoId: 1 });
    fake.dados.disciplinas.push(
      { id: DISCIPLINA, codigo: 'IF001', nome: 'Disciplina', ch: 60 },
      { id: DISCIPLINA + 1, codigo: 'IF002', nome: 'Outra', ch: 60 },
    );
  });

  describe('matrícula em turma lotada (regra 6)', () => {
    it('recusa quando as matrículas ativas atingem as vagas', async () => {
      const t = turma(1);
      await matricular(CARLA, t);

      expect(await codigoDoErro(matricular(ANA, t))).toEqual({ status: 422, code: 'TURMA_LOTADA' });
    });

    it('aceita enquanto houver vaga e para exatamente no limite', async () => {
      const t = turma(2);

      await expect(matricular(ANA, t)).resolves.toEqual({ id: expect.any(Number) });
      await expect(matricular(CARLA, t)).resolves.toEqual({ id: expect.any(Number) });
      expect(fake.dados.matriculas.filter((m) => m.turmaId === t)).toHaveLength(2);
    });

    it('matrículas canceladas não ocupam vaga', async () => {
      const t = turma(1);
      fake.dados.matriculas.push({
        id: fake.novoId(),
        alunoId: CARLA,
        turmaId: t,
        situacao: 'CANCELADA',
        criadaEm: new Date(),
      });

      await expect(matricular(ANA, t)).resolves.toBeDefined();
    });
  });

  describe('disciplina já cursada (regra 7)', () => {
    it('recusa disciplina aprovada no histórico', async () => {
      fake.dados.historico.push({ alunoId: ANA, disciplinaId: DISCIPLINA, situacao: 'APROVADO' });

      expect(await codigoDoErro(matricular(ANA, turma(30)))).toEqual({
        status: 422,
        code: 'DISCIPLINA_JA_APROVADA',
      });
    });

    it('aceita disciplina em que o aluno foi reprovado', async () => {
      fake.dados.historico.push({ alunoId: ANA, disciplinaId: DISCIPLINA, situacao: 'REPROVADO' });

      await expect(matricular(ANA, turma(30))).resolves.toBeDefined();
    });

    it('a aprovação de outro aluno não bloqueia', async () => {
      fake.dados.historico.push({ alunoId: CARLA, disciplinaId: DISCIPLINA, situacao: 'APROVADO' });

      await expect(matricular(ANA, turma(30))).resolves.toBeDefined();
    });
  });

  describe('duplicidade', () => {
    it('recusa segunda matrícula ativa na mesma turma (409)', async () => {
      const t = turma(30);
      await matricular(ANA, t);

      expect(await codigoDoErro(matricular(ANA, t))).toEqual({
        status: 409,
        code: 'JA_MATRICULADO_NA_TURMA',
      });
    });

    it('recusa outra turma da mesma disciplina', async () => {
      await matricular(ANA, turma(30));

      expect(await codigoDoErro(matricular(ANA, turma(30)))).toMatchObject({
        code: 'JA_MATRICULADO_NA_DISCIPLINA',
      });
    });

    it('quem já está na turma lotada recebe "já matriculado", não "lotada"', async () => {
      const t = turma(1);
      await matricular(ANA, t);

      expect(await codigoDoErro(matricular(ANA, t))).toMatchObject({
        code: 'JA_MATRICULADO_NA_TURMA',
      });
    });
  });

  it('turma inexistente responde 404', async () => {
    expect(await codigoDoErro(matricular(ANA, 999))).toEqual({
      status: 404,
      code: 'TURMA_NAO_ENCONTRADA',
    });
  });

  describe('cancelamento (regra 8)', () => {
    it('cancela a matrícula ativa e a vaga volta para a turma', async () => {
      const t = turma(1);
      const { id } = await matricular(ANA, t);

      await service.cancelarMatricula(ANA, id);

      await expect(matricular(CARLA, t)).resolves.toBeDefined();
    });

    it('recusa cancelar uma matrícula já cancelada', async () => {
      const { id } = await matricular(ANA, turma(30));
      await service.cancelarMatricula(ANA, id);

      expect(await codigoDoErro(service.cancelarMatricula(ANA, id))).toEqual({
        status: 422,
        code: 'MATRICULA_JA_CANCELADA',
      });
    });
  });

  describe('só as próprias matrículas (regra 9)', () => {
    it('não cancela matrícula de outro aluno e responde como inexistente', async () => {
      const { id } = await matricular(CARLA, turma(30));

      expect(await codigoDoErro(service.cancelarMatricula(ANA, id))).toEqual({
        status: 404,
        code: 'MATRICULA_NAO_ENCONTRADA',
      });
      expect(fake.dados.matriculas.find((m) => m.id === id)?.situacao).toBe('ATIVA');
    });

    it('lista apenas as matrículas ativas do próprio aluno', async () => {
      const minha = await matricular(ANA, turma(30));
      await matricular(CARLA, turma(30, DISCIPLINA + 1));

      const lista = await service.listarMatriculas(ANA);

      expect(lista.map((m) => m.id)).toEqual([minha.id]);
    });
  });

  describe('pré-requisitos (requisito à escolha)', () => {
    const PRE_A = DISCIPLINA + 20;
    const PRE_B = DISCIPLINA + 21;

    beforeEach(() => {
      fake.dados.disciplinas.push(
        { id: PRE_A, codigo: 'IF100', nome: 'Pré A', ch: 60 },
        { id: PRE_B, codigo: 'IF200', nome: 'Pré B', ch: 60 },
      );
      fake.dados.preRequisitos.push(
        { disciplinaId: DISCIPLINA, preRequisitoId: PRE_A },
        { disciplinaId: DISCIPLINA, preRequisitoId: PRE_B },
      );
    });

    it('recusa quando falta aprovação em algum pré-requisito e diz quais faltam', async () => {
      fake.dados.historico.push({ alunoId: ANA, disciplinaId: PRE_A, situacao: 'APROVADO' });

      const erro = await matricular(ANA, turma(30)).catch((e) => e);

      expect(erro).toMatchObject({
        status: 422,
        code: 'PRE_REQUISITO_PENDENTE',
        message: 'Você precisa ser aprovado antes em: IF200.',
        details: { pendentes: [{ id: PRE_B, codigo: 'IF200', nome: 'Pré B' }] },
      });
    });

    it('aceita quando todos os pré-requisitos estão aprovados', async () => {
      fake.dados.historico.push(
        { alunoId: ANA, disciplinaId: PRE_A, situacao: 'APROVADO' },
        { alunoId: ANA, disciplinaId: PRE_B, situacao: 'APROVADO' },
      );

      await expect(matricular(ANA, turma(30))).resolves.toBeDefined();
    });

    it('reprovação no pré-requisito não atende', async () => {
      fake.dados.historico.push(
        { alunoId: ANA, disciplinaId: PRE_A, situacao: 'APROVADO' },
        { alunoId: ANA, disciplinaId: PRE_B, situacao: 'REPROVADO' },
      );

      expect(await codigoDoErro(matricular(ANA, turma(30)))).toMatchObject({
        code: 'PRE_REQUISITO_PENDENTE',
      });
    });

    it('matrícula em curso no pré-requisito não atende (não cursa os dois juntos)', async () => {
      fake.dados.historico.push({ alunoId: ANA, disciplinaId: PRE_A, situacao: 'APROVADO' });
      await matricular(ANA, turma(30, PRE_B));

      expect(await codigoDoErro(matricular(ANA, turma(30)))).toMatchObject({
        code: 'PRE_REQUISITO_PENDENTE',
      });
    });

    it('pré-requisito pendente tem prioridade sobre turma lotada', async () => {
      const t = turma(1);
      fake.dados.matriculas.push({
        id: fake.novoId(),
        alunoId: CARLA,
        turmaId: t,
        situacao: 'ATIVA',
        criadaEm: new Date(),
      });

      expect(await codigoDoErro(matricular(ANA, t))).toMatchObject({
        code: 'PRE_REQUISITO_PENDENTE',
      });
    });

    it('as ofertas mostram cada pré-requisito e se está atendido', async () => {
      fake.dados.historico.push({ alunoId: ANA, disciplinaId: PRE_A, situacao: 'APROVADO' });
      turma(30);

      const ofertas = await service.listarOfertas(ANA, { page: 1, pageSize: 10, q: undefined });

      expect(ofertas.items[0]?.preRequisitos).toEqual([
        { id: PRE_A, codigo: 'IF100', nome: 'Pré A', atendido: true },
        { id: PRE_B, codigo: 'IF200', nome: 'Pré B', atendido: false },
      ]);
    });
  });

  it('aluno inexistente (token de aluno removido) responde 401', async () => {
    expect(await codigoDoErro(service.listarMatriculas(999))).toEqual({
      status: 401,
      code: 'TOKEN_INVALIDO',
    });
  });
});
