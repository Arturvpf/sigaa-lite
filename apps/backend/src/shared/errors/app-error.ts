/**
 * Erro de aplicação com status HTTP e código estável.
 *
 * O `code` é o contrato com o front-end (ex.: TURMA_LOTADA): a mensagem pode mudar,
 * o código não. Todos os erros saem da API no formato { code, message, details? }.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400 — dados de entrada inválidos (formato, tipo, campo obrigatório). */
export class ValidationError extends AppError {
  constructor(details: unknown, message = 'Dados de entrada inválidos.') {
    super(400, 'VALIDACAO', message, details);
  }
}

/** 401 — não autenticado: token ausente, inválido ou expirado, ou credenciais erradas. */
export class UnauthorizedError extends AppError {
  constructor(code = 'NAO_AUTENTICADO', message = 'Autenticação necessária.') {
    super(401, code, message);
  }
}

/** 403 — autenticado, mas sem permissão (perfil errado). */
export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para acessar este recurso.') {
    super(403, 'ACESSO_NEGADO', message);
  }
}

/** 404 — recurso inexistente (ou que o usuário não pode saber que existe). */
export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

/** 409 — conflito com o estado atual, como violação de unicidade. */
export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(409, code, message, details);
  }
}

/** 422 — requisição bem formada, mas recusada por regra de negócio. */
export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(422, code, message, details);
  }
}
