import { z } from 'zod';

const id = (campo: string) =>
  z.coerce
    .number({ error: `${campo} deve ser um número` })
    .int(`${campo} deve ser um número inteiro`)
    .positive(`${campo} deve ser um número positivo`);

export const matricularSchema = z.object({ turmaId: id('turmaId') });

export const matriculaParamsSchema = z.object({ id: id('id') });
