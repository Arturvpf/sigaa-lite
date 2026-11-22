import { z } from 'zod';

const id = (campo: string) =>
  z.coerce
    .number({ error: `${campo} deve ser um número` })
    .int(`${campo} deve ser um número inteiro`)
    .positive(`${campo} deve ser um número positivo`);

const texto = (campo: string, max: number) =>
  z
    .string({ error: `Informe ${campo}` })
    .trim()
    .min(1, `Informe ${campo}`)
    .max(max, `${campo} deve ter no máximo ${max} caracteres`);

export const idParamsSchema = z.object({ id: id('id') });

/** Regra 2: CH múltipla de 15, entre 15h e 120h. */
export const chSchema = z
  .number({ error: 'Informe a carga horária' })
  .int('A carga horária deve ser um número inteiro')
  .min(15, 'A carga horária deve ser de no mínimo 15h')
  .max(120, 'A carga horária deve ser de no máximo 120h')
  .refine((ch) => ch % 15 === 0, 'A carga horária deve ser múltipla de 15');

export const disciplinaSchema = z.object({
  // Código normalizado em maiúsculas, sem espaços: "if 668" e "IF668" são o mesmo código
  codigo: texto('o código', 20)
    .transform((codigo) => codigo.replace(/\s+/g, '').toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]+$/, 'O código deve ter só letras e números')),
  nome: texto('o nome', 120),
  ch: chSchema,
});

export type DisciplinaInput = z.output<typeof disciplinaSchema>;

export const professorSchema = z.object({
  nome: texto('o nome', 120),
  // E-mail normalizado em minúsculas: a unicidade (regra 3) não depende de maiúsculas
  email: z
    .string({ error: 'Informe o e-mail' })
    .trim()
    .toLowerCase()
    .pipe(z.email('Informe um e-mail válido').max(160, 'E-mail muito longo')),
});

export type ProfessorInput = z.output<typeof professorSchema>;

/** Regra 4: turma tem disciplina, professor e pelo menos 1 vaga. */
const vagasSchema = z
  .number({ error: 'Informe o número de vagas' })
  .int('O número de vagas deve ser inteiro')
  .min(1, 'A turma deve ter pelo menos 1 vaga')
  .max(1000, 'O número de vagas deve ser no máximo 1000');

export const turmaSchema = z.object({
  disciplinaId: id('disciplinaId'),
  professorId: id('professorId'),
  vagas: vagasSchema,
});

export type TurmaInput = z.output<typeof turmaSchema>;

export const vagasBodySchema = z.object({ vagas: vagasSchema });
