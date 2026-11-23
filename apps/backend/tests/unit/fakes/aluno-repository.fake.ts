import type { AlunoRepository } from '../../../src/modules/aluno/aluno.repository.js';

/**
 * Repositório do aluno em memória, para testar as regras do service sem banco.
 * Implementa só o comportamento que o service usa, com a mesma semântica das consultas reais.
 */
export function createAlunoRepositoryFake() {
  const dados = {
    alunos: [] as { id: number; cursoId: number }[],
    cursos: [] as {
      id: number;
      nome: string;
      chObrigatoria: number;
      chEletivaPerfil: number;
      chEletivaLivre: number;
      estrutura: { disciplinaId: number; tipo: 'OBRIGATORIA' | 'ELETIVA_PERFIL' }[];
    }[],
    disciplinas: [] as { id: number; codigo: string; nome: string; ch: number }[],
    turmas: [] as { id: number; disciplinaId: number; vagas: number }[],
    historico: [] as {
      alunoId: number;
      disciplinaId: number;
      situacao: 'APROVADO' | 'REPROVADO';
    }[],
    /** disciplinaId exige preRequisitoId */
    preRequisitos: [] as { disciplinaId: number; preRequisitoId: number }[],
    matriculas: [] as {
      id: number;
      alunoId: number;
      turmaId: number;
      situacao: 'ATIVA' | 'CANCELADA';
      criadaEm: Date;
    }[],
  };
  let proximoId = 1;

  const disciplina = (id: number) => {
    const d = dados.disciplinas.find((x) => x.id === id);
    if (!d) throw new Error(`disciplina ${id} não existe no fake`);
    return d;
  };
  const turmaDetalhada = (turmaId: number) => {
    const turma = dados.turmas.find((t) => t.id === turmaId)!;
    return {
      id: turma.id,
      disciplina: disciplina(turma.disciplinaId),
      professor: { id: 1, nome: 'Professor' },
    };
  };
  const ativas = (filtro: (m: (typeof dados.matriculas)[number]) => boolean) =>
    dados.matriculas.filter((m) => m.situacao === 'ATIVA' && filtro(m));

  const consultas = {
    async buscarContexto(alunoId: number) {
      const aluno = dados.alunos.find((a) => a.id === alunoId);
      if (!aluno) return null;
      return { id: aluno.id, curso: dados.cursos.find((c) => c.id === aluno.cursoId)! };
    },

    async listarTurmas({ skip, take }: { q?: string; skip: number; take: number }) {
      const turmas = dados.turmas.slice(skip, skip + take).map((t) => ({
        ...turmaDetalhada(t.id),
        disciplina: {
          ...disciplina(t.disciplinaId),
          preRequisitos: dados.preRequisitos
            .filter((p) => p.disciplinaId === t.disciplinaId)
            .map((p) => {
              const { id, codigo, nome } = disciplina(p.preRequisitoId);
              return { preRequisito: { id, codigo, nome } };
            }),
        },
        vagas: t.vagas,
        _count: { matriculas: ativas((m) => m.turmaId === t.id).length },
      }));
      return { turmas, total: dados.turmas.length };
    },

    async listarAprovadas(alunoId: number) {
      return dados.historico
        .filter((h) => h.alunoId === alunoId && h.situacao === 'APROVADO')
        .map((h) => ({ disciplina: { id: h.disciplinaId, ch: disciplina(h.disciplinaId).ch } }));
    },

    async listarMatriculasAtivas(alunoId: number) {
      return ativas((m) => m.alunoId === alunoId).map((m) => ({
        id: m.id,
        criadaEm: m.criadaEm,
        turma: turmaDetalhada(m.turmaId),
      }));
    },

    async travarTurma(turmaId: number) {
      const turma = dados.turmas.find((t) => t.id === turmaId);
      return turma ? { ...turma } : null;
    },

    async contarMatriculasAtivas(turmaId: number) {
      return ativas((m) => m.turmaId === turmaId).length;
    },

    async foiAprovado(alunoId: number, disciplinaId: number) {
      return dados.historico.some(
        (h) =>
          h.alunoId === alunoId && h.disciplinaId === disciplinaId && h.situacao === 'APROVADO',
      );
    },

    async listarPreRequisitosPendentes(alunoId: number, disciplinaId: number) {
      return dados.preRequisitos
        .filter((p) => p.disciplinaId === disciplinaId)
        .filter(
          (p) =>
            !dados.historico.some(
              (h) =>
                h.alunoId === alunoId &&
                h.disciplinaId === p.preRequisitoId &&
                h.situacao === 'APROVADO',
            ),
        )
        .map((p) => {
          const { id, codigo, nome } = disciplina(p.preRequisitoId);
          return { id, codigo, nome };
        });
    },

    async buscarMatriculaAtivaNaDisciplina(alunoId: number, disciplinaId: number) {
      const m = ativas(
        (x) =>
          x.alunoId === alunoId &&
          dados.turmas.find((t) => t.id === x.turmaId)?.disciplinaId === disciplinaId,
      )[0];
      return m ? { id: m.id, turmaId: m.turmaId } : null;
    },

    async criarMatricula(alunoId: number, turmaId: number) {
      const id = proximoId++;
      dados.matriculas.push({ id, alunoId, turmaId, situacao: 'ATIVA', criadaEm: new Date() });
      return { id };
    },

    async buscarMatriculaDoAluno(alunoId: number, matriculaId: number) {
      const m = dados.matriculas.find((x) => x.id === matriculaId && x.alunoId === alunoId);
      return m ? { id: m.id, situacao: m.situacao } : null;
    },

    async cancelarMatricula(matriculaId: number) {
      const m = dados.matriculas.find((x) => x.id === matriculaId && x.situacao === 'ATIVA');
      if (!m) return false;
      m.situacao = 'CANCELADA';
      return true;
    },
  };

  const repo = {
    ...consultas,
    transacao: <T>(fn: (tx: typeof consultas) => Promise<T>) => fn(consultas),
  };

  return { repo: repo as unknown as AlunoRepository, dados, novoId: () => proximoId++ };
}
