import { z } from 'zod';

export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Query string padrão das listagens: ?q=&page=&pageSize=
 * - `q` vazio ou só com espaços é tratado como "sem busca";
 * - `pageSize` tem teto para impedir consultas gigantes.
 */
export const paginationQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, 'A busca deve ter no máximo 100 caracteres')
    .optional()
    .transform((value) => (value ? value : undefined)),
  page: z.coerce.number().int().min(1, 'page deve ser no mínimo 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'pageSize deve ser no mínimo 1')
    .max(MAX_PAGE_SIZE, `pageSize deve ser no máximo ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.output<typeof paginationQuerySchema>;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Converte page/pageSize em skip/take do Prisma. */
export function toSkipTake({ page, pageSize }: PaginationQuery) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPage<T>(items: T[], total: number, query: PaginationQuery): Page<T> {
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  };
}
