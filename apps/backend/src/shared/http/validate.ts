import type { z } from 'zod';
import { ValidationError } from '../errors/app-error.js';

export interface ValidationIssue {
  campo: string;
  mensagem: string;
}

/**
 * Valida `data` com o schema e devolve o valor já tipado e normalizado.
 * Em caso de erro, lança ValidationError (400) com a lista de campos inválidos.
 */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details: ValidationIssue[] = result.error.issues.map((issue) => ({
      campo: issue.path.join('.') || '(corpo)',
      mensagem: issue.message,
    }));
    throw new ValidationError(details);
  }
  return result.data;
}
