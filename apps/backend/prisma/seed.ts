/**
 * Dados iniciais do SIGAA Lite.
 *
 * Pensados para exercitar as regras de negócio:
 * - CC e EC compartilham disciplinas com classificações diferentes (regra 10);
 * - CT001, LE500 e HU100 estão fora das duas estruturas (eletiva livre);
 * - Ana tem CH de eletiva de perfil acima do exigido (excedente vira livre — regra 11);
 * - Eduarda já ultrapassou o exigido em alguns grupos (percentual limitado a 100% — regra 13);
 * - há reprovações sendo recursadas e aprovações que bloqueiam nova matrícula (regras 7 e 12);
 * - IF676 está lotada e IF678 está com uma única vaga (regra 6).
 *
 * O seed é idempotente: apaga tudo e recria, então pode ser executado várias vezes.
 */
import 'dotenv/config';
import { createPrismaClient } from '../src/database/prisma.js';
import type { SituacaoHistorico, TipoDisciplina } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL não definida (veja apps/backend/.env.example)');

const prisma = createPrismaClient(databaseUrl);

const disciplinas = [
  { codigo: 'IF668', nome: 'Introdução à Programação', ch: 60 },
  { codigo: 'IF669', nome: 'Algoritmos e Estruturas de Dados', ch: 60 },
  { codigo: 'IF670', nome: 'Matemática Discreta', ch: 60 },
  { codigo: 'IF671', nome: 'Banco de Dados', ch: 60 },
  { codigo: 'IF672', nome: 'Engenharia de Software', ch: 60 },
  { codigo: 'IF673', nome: 'Redes de Computadores', ch: 60 },
  { codigo: 'IF674', nome: 'Sistemas Digitais', ch: 60 },
  { codigo: 'IF675', nome: 'Arquitetura de Computadores', ch: 60 },
  { codigo: 'IF676', nome: 'Inteligência Artificial', ch: 60 },
  { codigo: 'IF677', nome: 'Computação Gráfica', ch: 60 },
  { codigo: 'IF678', nome: 'Compiladores', ch: 60 },
  { codigo: 'IF679', nome: 'Processamento de Sinais', ch: 60 },
  { codigo: 'IF680', nome: 'Robótica', ch: 45 },
  { codigo: 'IF681', nome: 'Segurança da Informação', ch: 45 },
  // Fora das estruturas dos dois cursos: sempre eletiva livre
  { codigo: 'CT001', nome: 'Empreendedorismo', ch: 30 },
  { codigo: 'LE500', nome: 'Inglês Instrumental', ch: 30 },
  { codigo: 'HU100', nome: 'Ética e Sociedade', ch: 45 },
];

type Estrutura = Record<string, TipoDisciplina>;

const cursos: {
  nome: string;
  chObrigatoria: number;
  chEletivaPerfil: number;
  chEletivaLivre: number;
  estrutura: Estrutura;
}[] = [
  {
    nome: 'Ciência da Computação',
    chObrigatoria: 360,
    chEletivaPerfil: 120,
    chEletivaLivre: 60,
    estrutura: {
      IF668: 'OBRIGATORIA',
      IF669: 'OBRIGATORIA',
      IF670: 'OBRIGATORIA',
      IF671: 'OBRIGATORIA', // perfil em EC
      IF672: 'OBRIGATORIA', // perfil em EC
      IF678: 'OBRIGATORIA', // fora da estrutura de EC (livre)
      IF673: 'ELETIVA_PERFIL', // obrigatória em EC
      IF676: 'ELETIVA_PERFIL',
      IF677: 'ELETIVA_PERFIL', // fora da estrutura de EC (livre)
      IF681: 'ELETIVA_PERFIL',
    },
  },
  {
    nome: 'Engenharia da Computação',
    chObrigatoria: 360,
    chEletivaPerfil: 120,
    chEletivaLivre: 60,
    estrutura: {
      IF668: 'OBRIGATORIA',
      IF669: 'OBRIGATORIA',
      IF673: 'OBRIGATORIA', // perfil em CC
      IF674: 'OBRIGATORIA', // fora da estrutura de CC (livre)
      IF675: 'OBRIGATORIA',
      IF679: 'OBRIGATORIA',
      IF671: 'ELETIVA_PERFIL', // obrigatória em CC
      IF672: 'ELETIVA_PERFIL', // obrigatória em CC
      IF676: 'ELETIVA_PERFIL',
      IF680: 'ELETIVA_PERFIL',
    },
  },
];

const professores = [
  { nome: 'Maria Souza', email: 'maria.souza@exemplo.edu.br' },
  { nome: 'Ricardo Alves', email: 'ricardo.alves@exemplo.edu.br' },
  { nome: 'Juliana Costa', email: 'juliana.costa@exemplo.edu.br' },
  { nome: 'Fernando Lima', email: 'fernando.lima@exemplo.edu.br' },
  { nome: 'Patrícia Rocha', email: 'patricia.rocha@exemplo.edu.br' },
  { nome: 'Gustavo Nunes', email: 'gustavo.nunes@exemplo.edu.br' },
];

/** Turmas do semestre corrente. A chave identifica a turma nas matrículas abaixo. */
const turmas: Record<string, { disciplina: string; professorEmail: string; vagas: number }> = {
  IF668: { disciplina: 'IF668', professorEmail: 'gustavo.nunes@exemplo.edu.br', vagas: 45 },
  IF669: { disciplina: 'IF669', professorEmail: 'maria.souza@exemplo.edu.br', vagas: 40 },
  IF671: { disciplina: 'IF671', professorEmail: 'ricardo.alves@exemplo.edu.br', vagas: 30 },
  IF672: { disciplina: 'IF672', professorEmail: 'juliana.costa@exemplo.edu.br', vagas: 35 },
  IF673: { disciplina: 'IF673', professorEmail: 'fernando.lima@exemplo.edu.br', vagas: 30 },
  IF675: { disciplina: 'IF675', professorEmail: 'patricia.rocha@exemplo.edu.br', vagas: 25 },
  IF676: { disciplina: 'IF676', professorEmail: 'ricardo.alves@exemplo.edu.br', vagas: 2 }, // lotada
  IF678: { disciplina: 'IF678', professorEmail: 'maria.souza@exemplo.edu.br', vagas: 3 }, // 1 vaga
  IF680: { disciplina: 'IF680', professorEmail: 'fernando.lima@exemplo.edu.br', vagas: 20 },
  CT001: { disciplina: 'CT001', professorEmail: 'juliana.costa@exemplo.edu.br', vagas: 50 },
  LE500: { disciplina: 'LE500', professorEmail: 'gustavo.nunes@exemplo.edu.br', vagas: 30 },
  HU100: { disciplina: 'HU100', professorEmail: 'patricia.rocha@exemplo.edu.br', vagas: 40 },
};

type ItemHistorico = [semestre: string, codigo: string, situacao: SituacaoHistorico];

const alunos: {
  username: string;
  nome: string;
  curso: string;
  historico: ItemHistorico[];
  matriculasAtivas: string[];
  matriculasCanceladas?: string[];
}[] = [
  {
    // CC — perfil aprovada: 60 + 60 + 45 = 165h > 120h exigidas → 45h excedentes viram livre
    username: 'ana',
    nome: 'Ana Beatriz Lima',
    curso: 'Ciência da Computação',
    historico: [
      ['2024.1', 'IF668', 'APROVADO'],
      ['2024.1', 'IF670', 'APROVADO'],
      ['2024.2', 'IF669', 'APROVADO'],
      ['2024.2', 'IF671', 'REPROVADO'],
      ['2024.2', 'IF676', 'APROVADO'],
      ['2025.1', 'IF677', 'APROVADO'],
      ['2025.1', 'IF681', 'APROVADO'],
    ],
    matriculasAtivas: ['IF671', 'IF678'], // recursando IF671
    matriculasCanceladas: ['IF673'],
  },
  {
    // CC — reprovou IF669 e está recursando; ocupa uma das 2 vagas de IF676
    username: 'bruno',
    nome: 'Bruno Carvalho',
    curso: 'Ciência da Computação',
    historico: [
      ['2025.1', 'IF668', 'APROVADO'],
      ['2025.1', 'IF669', 'REPROVADO'],
      ['2025.1', 'CT001', 'APROVADO'],
    ],
    matriculasAtivas: ['IF669', 'IF676'],
  },
  {
    // EC — IF677 conta como livre e IF671 como perfil para EC
    username: 'carla',
    nome: 'Carla Mendes',
    curso: 'Engenharia da Computação',
    historico: [
      ['2024.2', 'IF668', 'APROVADO'],
      ['2024.2', 'IF669', 'APROVADO'],
      ['2024.2', 'IF674', 'APROVADO'],
      ['2025.1', 'IF675', 'REPROVADO'],
      ['2025.1', 'IF677', 'APROVADO'],
      ['2025.1', 'IF671', 'APROVADO'],
    ],
    matriculasAtivas: ['IF675', 'IF678'], // IF678 é livre para EC
  },
  {
    // EC — calouro, sem histórico; ocupa a outra vaga de IF676
    username: 'diego',
    nome: 'Diego Rocha',
    curso: 'Engenharia da Computação',
    historico: [],
    matriculasAtivas: ['IF676'],
  },
  {
    // EC — quase formada: obrigatórias e perfil completos, livre acima do exigido (105h de 60h)
    username: 'eduarda',
    nome: 'Eduarda Santos',
    curso: 'Engenharia da Computação',
    historico: [
      ['2022.1', 'IF668', 'APROVADO'],
      ['2022.1', 'IF674', 'APROVADO'],
      ['2022.2', 'IF669', 'APROVADO'],
      ['2022.2', 'IF675', 'REPROVADO'],
      ['2023.1', 'IF675', 'APROVADO'],
      ['2023.1', 'IF673', 'APROVADO'],
      ['2023.2', 'IF679', 'APROVADO'],
      ['2023.2', 'IF671', 'APROVADO'],
      ['2024.1', 'IF672', 'APROVADO'],
      ['2024.1', 'IF677', 'APROVADO'],
      ['2024.2', 'HU100', 'APROVADO'],
    ],
    matriculasAtivas: ['LE500'],
  },
];

async function limparBanco() {
  // Ordem e CASCADE não importam com TRUNCATE de todas as tabelas de uma vez;
  // RESTART IDENTITY faz os ids recomeçarem em 1 a cada execução.
  await prisma.$executeRaw`
    TRUNCATE TABLE matriculas, historico_itens, turmas, alunos, estruturas_curriculares,
                   professores, disciplinas, cursos, usuarios
    RESTART IDENTITY CASCADE
  `;
}

async function main() {
  await limparBanco();

  const disciplinaId = new Map<string, number>();
  for (const d of disciplinas) {
    const criada = await prisma.disciplina.create({ data: d });
    disciplinaId.set(d.codigo, criada.id);
  }
  const idDaDisciplina = (codigo: string) => {
    const id = disciplinaId.get(codigo);
    if (!id) throw new Error(`Disciplina ${codigo} não existe no seed`);
    return id;
  };

  const cursoId = new Map<string, number>();
  for (const { estrutura, ...dados } of cursos) {
    const curso = await prisma.curso.create({
      data: {
        ...dados,
        estrutura: {
          create: Object.entries(estrutura).map(([codigo, tipo]) => ({
            disciplinaId: idDaDisciplina(codigo),
            tipo,
          })),
        },
      },
    });
    cursoId.set(curso.nome, curso.id);
  }

  const professorId = new Map<string, number>();
  for (const p of professores) {
    const criado = await prisma.professor.create({ data: p });
    professorId.set(p.email, criado.id);
  }

  const turmaId = new Map<string, number>();
  for (const [chave, t] of Object.entries(turmas)) {
    const criada = await prisma.turma.create({
      data: {
        disciplinaId: idDaDisciplina(t.disciplina),
        professorId: professorId.get(t.professorEmail)!,
        vagas: t.vagas,
      },
    });
    turmaId.set(chave, criada.id);
  }

  await prisma.usuario.create({ data: { username: 'secretaria', perfil: 'SECRETARIA' } });

  for (const a of alunos) {
    await prisma.aluno.create({
      data: {
        nome: a.nome,
        curso: { connect: { id: cursoId.get(a.curso)! } },
        usuario: { create: { username: a.username, perfil: 'ALUNO' } },
        historico: {
          create: a.historico.map(([semestre, codigo, situacao]) => ({
            semestre,
            situacao,
            disciplinaId: idDaDisciplina(codigo),
          })),
        },
        matriculas: {
          create: [
            ...a.matriculasAtivas.map((t) => ({ turmaId: turmaId.get(t)! })),
            ...(a.matriculasCanceladas ?? []).map((t) => ({
              turmaId: turmaId.get(t)!,
              situacao: 'CANCELADA' as const,
              canceladaEm: new Date(),
            })),
          ],
        },
      },
    });
  }

  console.log(
    `Seed concluído: ${disciplinas.length} disciplinas, ${cursos.length} cursos, ` +
      `${professores.length} professores, ${Object.keys(turmas).length} turmas, ` +
      `${alunos.length} alunos e 1 usuário da secretaria.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
