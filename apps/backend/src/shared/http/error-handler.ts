import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { AppError, NotFoundError } from '../errors/app-error.js';

export interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/** Rota inexistente → 404 no formato padrão. */
export const notFoundHandler: RequestHandler = (req) => {
  throw new NotFoundError('ROTA_NAO_ENCONTRADA', `Rota ${req.method} ${req.path} não encontrada.`);
};

/**
 * Handler global: converte qualquer erro no formato { code, message, details? }.
 * Erros inesperados viram 500 sem vazar detalhes internos ao cliente.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const { status, body } = toHttpError(error);
  if (status >= 500) console.error(error);
  res.status(status).json(body);
};

function toHttpError(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message, details: error.details },
    };
  }

  // JSON malformado no corpo (lançado pelo express.json)
  if (isBodyParserError(error)) {
    return {
      status: 400,
      body: { code: 'JSON_INVALIDO', message: 'O corpo da requisição não é um JSON válido.' },
    };
  }

  // Violação de unicidade que escapou da validação do service (ex.: corrida entre duas requisições)
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return {
      status: 409,
      body: { code: 'REGISTRO_DUPLICADO', message: 'Já existe um registro com esses dados.' },
    };
  }

  return {
    status: 500,
    body: { code: 'ERRO_INTERNO', message: 'Erro interno do servidor.' },
  };
}

function isBodyParserError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    'type' in error &&
    (error as { type?: string }).type === 'entity.parse.failed'
  );
}
