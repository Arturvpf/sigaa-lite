import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/shared/errors/app-error.js';
import {
  buildPage,
  MAX_PAGE_SIZE,
  paginationQuerySchema,
  toSkipTake,
} from '../../src/shared/http/pagination.js';
import { parse } from '../../src/shared/http/validate.js';

const parseQuery = (query: Record<string, string>) => parse(paginationQuerySchema, query);

describe('paginação', () => {
  it('usa página 1 e tamanho 10 quando nada é informado', () => {
    expect(parseQuery({})).toEqual({ q: undefined, page: 1, pageSize: 10 });
  });

  it('converte os valores da query string em números', () => {
    expect(parseQuery({ q: 'IF6', page: '3', pageSize: '20' })).toEqual({
      q: 'IF6',
      page: 3,
      pageSize: 20,
    });
  });

  it('trata busca vazia ou só com espaços como ausência de busca', () => {
    expect(parseQuery({ q: '   ' }).q).toBeUndefined();
  });

  it(`recusa pageSize acima de ${MAX_PAGE_SIZE} e página menor que 1`, () => {
    expect(() => parseQuery({ pageSize: String(MAX_PAGE_SIZE + 1) })).toThrow(ValidationError);
    expect(() => parseQuery({ page: '0' })).toThrow(ValidationError);
    expect(() => parseQuery({ page: 'abc' })).toThrow(ValidationError);
  });

  it('calcula skip/take e o total de páginas', () => {
    const query = { q: undefined, page: 3, pageSize: 10 };

    expect(toSkipTake(query)).toEqual({ skip: 20, take: 10 });
    expect(buildPage(['a'], 21, query)).toEqual({
      items: ['a'],
      total: 21,
      page: 3,
      pageSize: 10,
      totalPages: 3,
    });
  });
});
