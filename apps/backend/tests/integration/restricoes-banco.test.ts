import { describe, expect, it } from 'vitest';
import { setupIntegration } from './test-context.js';

/**
 * Regras de cadastro garantidas pelo próprio PostgreSQL (constraints da migration).
 * A API também valida essas regras com mensagens claras (Fase 7); estes testes garantem
 * que, mesmo se um caminho esquecer a validação, o banco recusa o dado inválido.
 */
const { prisma, fabrica } = setupIntegration();

describe('restrições do banco', () => {
  describe('regra 1: código da disciplina é único', () => {
    it('recusa um segundo cadastro com o mesmo código', async () => {
      await fabrica.disciplina('IF668');

      await expect(fabrica.disciplina('IF668')).rejects.toThrow(/codigo/);
    });
  });

  describe('regra 2: CH múltipla de 15, entre 15h e 120h', () => {
    it.each([10, 20, 125, 0, -15, 135])('recusa CH %ih', async (ch) => {
      await expect(fabrica.disciplina(`X${ch}`, ch)).rejects.toThrow(/disciplinas_ch_check/);
    });

    it.each([15, 60, 120])('aceita CH %ih', async (ch) => {
      await expect(fabrica.disciplina(`OK${ch}`, ch)).resolves.toMatchObject({ ch });
    });
  });

  describe('regra 3: e-mail do professor é único', () => {
    it('recusa um segundo professor com o mesmo e-mail', async () => {
      await fabrica.professor('maria@exemplo.edu.br');

      await expect(fabrica.professor('maria@exemplo.edu.br')).rejects.toThrow(/email/);
    });
  });

  describe('regra 4: turma tem disciplina, professor e pelo menos 1 vaga', () => {
    it('recusa turma com 0 vagas e aceita com 1', async () => {
      const disciplina = await fabrica.disciplina('IF668');

      await expect(fabrica.turma(disciplina.id, 0)).rejects.toThrow(/turmas_vagas_check/);
      await expect(fabrica.turma(disciplina.id, 1)).resolves.toMatchObject({ vagas: 1 });
    });

    it('recusa turma com disciplina ou professor inexistente', async () => {
      const disciplina = await fabrica.disciplina('IF668');
      const professor = await fabrica.professor();

      await expect(
        prisma.turma.create({ data: { disciplinaId: 999, professorId: professor.id, vagas: 10 } }),
      ).rejects.toThrow(/disciplina_id/);
      await expect(
        prisma.turma.create({ data: { disciplinaId: disciplina.id, professorId: 999, vagas: 10 } }),
      ).rejects.toThrow(/professor_id/);
    });
  });

  describe('matrícula', () => {
    it('não permite duas matrículas ativas do mesmo aluno na mesma turma', async () => {
      const curso = await fabrica.curso();
      const aluno = await fabrica.aluno('ana', curso.id);
      const turma = await fabrica.turma((await fabrica.disciplina('IF668')).id);
      await fabrica.matricula(aluno.id, turma.id);

      await expect(fabrica.matricula(aluno.id, turma.id)).rejects.toThrow(
        /matriculas_aluno_turma_ativa_key/,
      );
    });

    it('permite nova matrícula ativa depois de cancelar a anterior', async () => {
      const curso = await fabrica.curso();
      const aluno = await fabrica.aluno('ana', curso.id);
      const turma = await fabrica.turma((await fabrica.disciplina('IF668')).id);
      const anterior = await fabrica.matricula(aluno.id, turma.id);
      await prisma.matricula.update({
        where: { id: anterior.id },
        data: { situacao: 'CANCELADA', canceladaEm: new Date() },
      });

      await expect(fabrica.matricula(aluno.id, turma.id)).resolves.toBeDefined();
    });
  });
});
